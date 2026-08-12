import {
  ItemView,
  Menu,
  Notice,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import type { Moment } from "moment";
import { createApp, shallowReactive, type App as VueApp } from "vue";

import { CalendarApp } from "./calendar/CalendarApp";
import {
  getDateId,
  getWeekId,
  startOfConfiguredWeek,
} from "./calendar/date-grid";
import { groupNotesByVisibleFrontmatterDates } from "./calendar/frontmatter-dates";
import { readNoteMetadata } from "./calendar/note-metadata";
import { DATE_FORMAT, VIEW_TYPE_CALENDAR } from "./constants";
import { moment } from "./moment";
import type CalendarPlugin from "./main";
import { NoteService } from "./services/note-service";
import type {
  CalendarController,
  CalendarState,
  PeriodType,
} from "./types";
import { ConfirmCreateModal } from "./ui/ConfirmModal";

/**
 * Obsidian 日历视图宿主。
 *
 * 持有 Vue 共享状态并实现 CalendarController，将 Vue 组件的交互转换为
 * Obsidian 工作区、仓库、元数据缓存和文件菜单操作。
 */
export class CalendarView extends ItemView implements CalendarController {
  private vueApp: VueApp<Element> | null = null;
  private readonly state: CalendarState;
  private readonly noteService: NoteService;
  private datedNotesRequestId = 0;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: CalendarPlugin,
  ) {
    super(leaf);
    const today = moment();
    this.state = shallowReactive<CalendarState>({
      displayedMonth: today.format(DATE_FORMAT),
      today: today.format(DATE_FORMAT),
      selectedId: null,
      dailyNotes: {},
      weeklyNotes: {},
      datedNotes: {},
      metadata: {},
      settings: { ...plugin.settings },
      uiLocale: plugin.i18n.locale,
      revision: 0,
    });
    this.noteService = new NoteService(
      this.app,
      () => this.plugin.settings,
      this.plugin.i18n,
    );
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return this.plugin.i18n.t("view.calendar");
  }

  getIcon(): string {
    return "calendar-days";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("calendar-vue-view");
    const mountEl = this.contentEl.createDiv({ cls: "calendar-vue-mount" });
    this.vueApp = createApp(CalendarApp, {
      state: this.state,
      controller: this,
    });
    this.vueApp.mount(mountEl);

    this.registerVaultEvents();
    this.registerInterval(
      window.setInterval(() => {
        // 跨过午夜时只更新“今天”标记，无需重建整个 Vue 应用。
        const nextToday = moment().format(DATE_FORMAT);
        if (nextToday !== this.state.today) {
          this.state.today = nextToday;
          this.state.revision += 1;
        }
      }, 60_000),
    );
    await this.refreshNotes();
  }

  async onClose(): Promise<void> {
    this.vueApp?.unmount();
    this.vueApp = null;
  }

  async refreshFromSettings(): Promise<void> {
    this.state.settings = { ...this.plugin.settings };
    this.state.uiLocale = this.plugin.i18n.locale;
    this.state.metadata = {};
    await this.refreshNotes();
  }

  /** 将当前显示月份按 delta 向前或向后移动。 */
  changeMonth(delta: number): void {
    this.state.displayedMonth = moment(this.state.displayedMonth)
      .add(delta, "months")
      .startOf("month")
      .format(DATE_FORMAT);
  }

  /** 设置当前年份内的月份，month 使用 Moment 的 0～11 索引。 */
  setDisplayedMonth(month: number): void {
    this.state.displayedMonth = moment(this.state.displayedMonth)
      .month(month)
      .startOf("month")
      .format(DATE_FORMAT);
  }

  /** 切换显示年份，并保持从该年当前月份的月初开始。 */
  setDisplayedYear(year: number): void {
    this.state.displayedMonth = moment(this.state.displayedMonth)
      .year(year)
      .startOf("month")
      .format(DATE_FORMAT);
  }

  showToday(): void {
    const today = moment();
    this.state.today = today.format(DATE_FORMAT);
    this.state.displayedMonth = this.state.today;
  }

  /** 打开已有日记，或按配置确认后创建并打开日记。 */
  async openDay(date: Moment, inNewSplit: boolean): Promise<void> {
    await this.openOrCreate("day", date, inNewSplit);
  }

  /** 将传入日期归一到配置的周首日后打开或创建周记。 */
  async openWeek(date: Moment, inNewSplit: boolean): Promise<void> {
    const weekStart = startOfConfiguredWeek(date, this.plugin.settings.weekStart);
    await this.openOrCreate("week", weekStart, inNewSplit);
  }

  /** 触发 Obsidian 标准文件菜单，并追加本插件的删除入口。 */
  showFileMenu(file: TFile, event: MouseEvent): void {
    const menu = new Menu();
    menu.addItem((item) =>
      item
        .setTitle(this.plugin.i18n.t("menu.delete"))
        .setIcon("trash")
        .onClick(() => void this.app.fileManager.trashFile(file)),
    );
    this.app.workspace.trigger(
      "file-menu",
      menu,
      file,
      "calendar-vue-context-menu",
      this,
    );
    menu.showAtMouseEvent(event);
  }

  /** 通过 Obsidian hover-link 事件复用原生链接预览。 */
  showHoverPreview(file: TFile, event: MouseEvent, target: HTMLElement): void {
    this.app.workspace.trigger("hover-link", {
      event,
      source: VIEW_TYPE_CALENDAR,
      hoverParent: this,
      targetEl: target,
      linktext: file.basename,
      sourcePath: this.app.workspace.getActiveFile()?.path ?? "",
    });
  }

  /**
   * 并行读取可见笔记的任务和标签元数据。
   * mtime 与 size 共同组成轻量缓存键，未变化的文件不会重复读取正文。
   */
  async loadMetadata(files: TFile[]): Promise<void> {
    const updates = await Promise.all(
      files.map(async (file) => {
        const cacheKey = `${file.stat.mtime}:${file.stat.size}`;
        const current = this.state.metadata[file.path];
        if (current?.cacheKey === cacheKey) {
          return null;
        }
        const cache = this.app.metadataCache.getFileCache(file);
        const metadata = await readNoteMetadata(this.app.vault, file, cache);
        return [file.path, metadata] as const;
      }),
    );

    const changed = updates.filter(
      (update): update is NonNullable<typeof update> => update !== null,
    );
    if (changed.length) {
      const nextMetadata = { ...this.state.metadata };
      for (const [path, metadata] of changed) {
        nextMetadata[path] = metadata;
      }
      this.state.metadata = nextMetadata;
    }
  }

  /**
   * 异步查询 Frontmatter 中包含当前可见日期的普通笔记。
   * 日记已经由独立索引展示，因此从结果中排除，避免详情面板重复。
   */
  async loadDatedNotes(dateIds: string[]): Promise<void> {
    const requestId = ++this.datedNotesRequestId;
    const visibleDateIds = new Set(dateIds);
    const dailyPaths = new Set(
      Object.values(this.state.dailyNotes).map((file) => file.path),
    );

    // 将全库 Frontmatter 缓存查询移出当前渲染调用栈。
    await Promise.resolve();

    const datedNotes = groupNotesByVisibleFrontmatterDates(
      this.app.vault.getMarkdownFiles(),
      (file) => this.app.metadataCache.getFileCache(file)?.frontmatter,
      visibleDateIds,
      dailyPaths,
    );
    if (requestId === this.datedNotesRequestId) {
      this.state.datedNotes = datedNotes;
    }
  }

  /** 在当前分栏或新分栏中打开详情面板中的普通笔记。 */
  async openNote(file: TFile, inNewSplit: boolean): Promise<void> {
    await this.openFile(file, inNewSplit);
  }

  /** 在日历中定位 Obsidian 当前活动的日记或周记。 */
  revealActiveNote(): void {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice(this.plugin.i18n.t("notice.noActiveNote"));
      return;
    }
    const entry = [
      ...Object.entries(this.state.dailyNotes),
      ...Object.entries(this.state.weeklyNotes),
    ].find(([, file]) => file.path === activeFile.path);
    if (!entry) {
      new Notice(this.plugin.i18n.t("notice.activeNoteNotPeriodic"));
      return;
    }
    const dateId = entry[0].replace(/^week:/, "");
    this.state.displayedMonth = dateId;
    this.state.selectedId = entry[0];
  }

  /** 注册仓库和工作区事件，使索引、选中态与元数据缓存保持同步。 */
  private registerVaultEvents(): void {
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          void this.refreshNotes();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          void this.refreshNotes();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          void this.refreshNotes();
        }
      }),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", () => this.updateSelectedFile()),
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        // 只失效发生变化的文件，下一次可见文件加载时再重新解析。
        const metadata = { ...this.state.metadata };
        delete metadata[file.path];
        this.state.metadata = metadata;
        this.state.revision += 1;
      }),
    );
    this.registerEvent(
      this.app.workspace.on(
        "periodic-notes:settings-updated" as never,
        () => void this.refreshFromSettings(),
      ),
    );
  }

  /** 重建日记/周记索引，并通知依赖 revision 的组件重新加载元数据。 */
  private async refreshNotes(): Promise<void> {
    this.state.dailyNotes = this.noteService.indexNotes("day");
    this.state.weeklyNotes = this.noteService.indexNotes("week");
    this.updateSelectedFile();
    this.state.revision += 1;
  }

  /** 将当前活动文件映射到日历单元格的选中状态。 */
  private updateSelectedFile(): void {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      this.state.selectedId = null;
      return;
    }
    const dailyEntry = Object.entries(this.state.dailyNotes).find(
      ([, file]) => file.path === activeFile.path,
    );
    if (dailyEntry) {
      this.state.selectedId = dailyEntry[0];
      return;
    }
    const weeklyEntry = Object.entries(this.state.weeklyNotes).find(
      ([, file]) => file.path === activeFile.path,
    );
    this.state.selectedId = weeklyEntry?.[0] ?? null;
  }

  /**
   * 统一处理日记和周记的“查找 → 可选确认 → 创建 → 打开”流程。
   * @param type 周期类型，day 表示日记，week 表示周记。
   * @param date 目标日期；周记调用方应传入已归一化的周首日。
   * @param inNewSplit 是否在新的 Obsidian 分栏中打开。
   */
  private async openOrCreate(
    type: PeriodType,
    date: Moment,
    inNewSplit: boolean,
  ): Promise<void> {
    const id =
      type === "day"
        ? getDateId(date)
        : getWeekId(date, this.plugin.settings.weekStart);
    const index = type === "day" ? this.state.dailyNotes : this.state.weeklyNotes;
    const existing = index[id] ?? this.noteService.findNote(type, date);
    if (existing) {
      await this.openFile(existing, inNewSplit);
      return;
    }

    const createAndOpen = async (): Promise<void> => {
      try {
        const file = await this.noteService.createNote(type, date);
        await this.refreshNotes();
        await this.openFile(file, inNewSplit);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        new Notice(this.plugin.i18n.t("notice.createNoteFailed", { message }));
      }
    };

    if (this.plugin.settings.shouldConfirmBeforeCreate) {
      const label = this.plugin.i18n.t(
        type === "day" ? "note.daily" : "note.weekly",
      );
      new ConfirmCreateModal(
        this.app,
        this.plugin.i18n.t("modal.createTitle", { type: label }),
        this.plugin.i18n.t("modal.createDescription", { type: label }),
        this.plugin.i18n.t("action.cancel"),
        this.plugin.i18n.t("action.create"),
        createAndOpen,
      ).open();
      return;
    }
    await createAndOpen();
  }

  /** 在当前分栏或新分栏中打开文件，并同步活动单元格。 */
  private async openFile(file: TFile, inNewSplit: boolean): Promise<void> {
    const leaf = this.app.workspace.getLeaf(inNewSplit ? "split" : false);
    await leaf.openFile(file, { active: true });
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    this.updateSelectedFile();
  }

}
