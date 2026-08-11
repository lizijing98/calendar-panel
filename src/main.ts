import {
  Notice,
  Plugin,
  WorkspaceLeaf,
  setTooltip,
  type Command,
} from "obsidian";

import "./style/index.scss";

import { CalendarView } from "./CalendarView";
import { VIEW_TYPE_CALENDAR, WEEKDAY_NAMES } from "./constants";
import { CalendarI18n, type TranslationKey } from "./i18n";
import { moment } from "./moment";
import { CalendarSettingTab, DEFAULT_SETTINGS } from "./settings";
import type { CalendarSettings } from "./types";

/** 插件入口：注册日历视图、命令、设置页，并管理 Moment 区域配置。 */
export default class CalendarPlugin extends Plugin {
  settings: CalendarSettings = { ...DEFAULT_SETTINGS };
  readonly i18n = new CalendarI18n();
  private ribbonElement: HTMLElement | null = null;
  private readonly localizedCommands: Array<{
    command: Command;
    key: TranslationKey;
  }> = [];
  private readonly defaultLocale = moment.locale();
  private readonly localeWeekSpecs = new Map<
    string,
    { dow: number; doy: number }
  >();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.i18n.setLanguage(this.settings.uiLanguage);
    this.applyLocale();

    this.registerView(
      VIEW_TYPE_CALENDAR,
      (leaf: WorkspaceLeaf) => new CalendarView(leaf, this),
    );

    this.ribbonElement = this.addRibbonIcon(
      "calendar-days",
      this.i18n.t("plugin.openCalendar"),
      () => {
        void this.activateView();
      },
    );

    this.registerLocalizedCommand("command.openCalendar", {
      id: "open-calendar-view",
      callback: () => void this.activateView(),
    });
    this.registerLocalizedCommand("command.openWeeklyNote", {
      id: "open-current-weekly-note",
      callback: async () => {
        const view = await this.getOrCreateView();
        await view.openWeek(moment(), false);
      },
    });
    this.registerLocalizedCommand("command.revealActiveNote", {
      id: "reveal-active-note",
      callback: async () => {
        const view = await this.getOrCreateView();
        view.revealActiveNote();
      },
    });

    this.addSettingTab(new CalendarSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      void this.getOrCreateView();
    });
  }

  onunload(): void {
    for (const [locale, week] of this.localeWeekSpecs) {
      moment.updateLocale(locale, { week });
    }
    moment.locale(this.defaultLocale);
  }

  async updateSettings(patch: Partial<CalendarSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    this.i18n.setLanguage(this.settings.uiLanguage);
    this.refreshLocalizedPluginChrome();
    this.applyLocale();
    await this.saveData(this.settings);
    await Promise.all(
      this.app.workspace
        .getLeavesOfType(VIEW_TYPE_CALENDAR)
        .map((leaf) =>
          leaf.view instanceof CalendarView
            ? leaf.view.refreshFromSettings()
            : Promise.resolve(),
        ),
    );
  }

  /** 注册命令并保留引用，以便切换界面语言时刷新命令面板文案。 */
  private registerLocalizedCommand(
    key: TranslationKey,
    command: Omit<Command, "name">,
  ): void {
    const registered = this.addCommand({ ...command, name: this.i18n.t(key) });
    this.localizedCommands.push({ command: registered, key });
  }

  /** 刷新无需重新注册即可更新的 Obsidian 外层界面文案。 */
  private refreshLocalizedPluginChrome(): void {
    const ribbonLabel = this.i18n.t("plugin.openCalendar");
    if (this.ribbonElement) {
      this.ribbonElement.setAttribute("aria-label", ribbonLabel);
      setTooltip(this.ribbonElement, ribbonLabel);
    }
    for (const { command, key } of this.localizedCommands) {
      command.name = this.i18n.t(key);
    }
  }

  /** 判断 Periodic Notes 是否已接管周记配置。 */
  hasPeriodicWeeklyNotes(): boolean {
    // plugins 不属于 Obsidian 公共类型，这里仅通过最小结构访问可选插件。
    const appWithPlugins = this.app as typeof this.app & {
      plugins?: {
        getPlugin?: (id: string) => {
          settings?: { weekly?: { enabled?: boolean } };
        } | null;
      };
    };
    return Boolean(
      appWithPlugins.plugins?.getPlugin?.("periodic-notes")?.settings?.weekly
        ?.enabled,
    );
  }

  /** 加载持久化配置，并丢弃旧版已经移除的 wordsPerDot 字段。 */
  private async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as
      | (Partial<CalendarSettings> & { wordsPerDot?: unknown })
      | null;
    const currentSettings = { ...(stored ?? {}) };
    delete currentSettings.wordsPerDot;
    this.settings = { ...DEFAULT_SETTINGS, ...currentSettings };
  }

  /**
   * 应用界面语言和每周起始日，同时保存原区域的 week 配置供卸载时恢复。
   */
  private applyLocale(): void {
    const activeLocale = moment.locale();
    const activeWeek = this.localeWeekSpecs.get(activeLocale);
    if (activeWeek) {
      moment.updateLocale(activeLocale, { week: activeWeek });
    }

    const locale =
      this.settings.localeOverride === "system-default"
        ? this.defaultLocale
        : this.settings.localeOverride;
    moment.locale(locale);
    const localeName = moment.locale();
    let week = this.localeWeekSpecs.get(localeName);
    if (!week) {
      const localeData = moment.localeData();
      week = {
        dow: localeData.firstDayOfWeek(),
        doy: localeData.firstDayOfYear(),
      };
      this.localeWeekSpecs.set(localeName, week);
    }
    const dow =
      this.settings.weekStart === "locale"
        ? week.dow
        : WEEKDAY_NAMES.indexOf(this.settings.weekStart);
    moment.updateLocale(localeName, {
      week: { dow, doy: week.doy },
    });
    moment.locale(localeName);
  }

  /** 获取或创建日历视图并在工作区中显示。 */
  private async activateView(): Promise<void> {
    const view = await this.getOrCreateView();
    await this.app.workspace.revealLeaf(view.leaf);
  }

  /** 优先复用现有日历叶子，否则在右侧边栏创建一个新视图。 */
  private async getOrCreateView(): Promise<CalendarView> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
    if (existing?.view instanceof CalendarView) {
      return existing.view;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      new Notice(this.i18n.t("notice.createViewFailed"));
      throw new Error("No workspace leaf available for calendar view");
    }
    await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
    if (!(leaf.view instanceof CalendarView)) {
      throw new Error("Calendar view failed to initialize");
    }
    return leaf.view;
  }
}
