import {
  App,
  normalizePath,
  TFile,
  TFolder,
} from "obsidian";
import type { Moment } from "moment";

import {
  DEFAULT_DAILY_FORMAT,
  DEFAULT_WEEKLY_FORMAT,
  WEEKDAY_NAMES,
} from "../constants";
import type { CalendarI18n } from "../i18n";
import { moment } from "../moment";
import { getDateId, getWeekId, getWeekStartIndex } from "../calendar/date-grid";
import type {
  CalendarSettings,
  PeriodicNoteSettings,
  PeriodType,
} from "../types";

interface InternalPluginRecord {
  enabled?: boolean;
  instance?: {
    options?: Partial<PeriodicNoteSettings>;
  };
}

interface PeriodicNotesPlugin {
  settings?: {
    daily?: Partial<PeriodicNoteSettings>;
    weekly?: Partial<PeriodicNoteSettings>;
  };
}

/**
 * 日记/周记文件服务。
 *
 * 负责兼容 Obsidian 核心 Daily Notes 与社区插件 Periodic Notes 的设置，
 * 并提供索引、查找、模板渲染和创建文件能力。
 */
export class NoteService {
  constructor(
    private readonly app: App,
    private readonly getCalendarSettings: () => CalendarSettings,
    private readonly i18n: CalendarI18n,
  ) {}

  /** 获取指定周期最终生效的目录、格式与模板配置。 */
  getSettings(type: PeriodType): PeriodicNoteSettings {
    if (type === "day") {
      return this.getDailySettings();
    }
    return this.getWeeklySettings();
  }

  /**
   * 扫描仓库并按日期/周 ID 建立笔记索引。
   * 只有路径和文件名能被配置格式严格解析的 Markdown 文件才会收录。
   */
  indexNotes(type: PeriodType): Record<string, TFile> {
    const settings = this.getSettings(type);
    const result: Record<string, TFile> = {};

    for (const file of this.app.vault.getMarkdownFiles()) {
      const relativePath = this.getRelativeStem(file, settings.folder);
      if (relativePath === null) {
        continue;
      }

      const date = moment(relativePath, settings.format, true);
      if (!date.isValid()) {
        continue;
      }

      const id =
        type === "day"
          ? getDateId(date)
          : getWeekId(date, this.getCalendarSettings().weekStart);
      result[id] = file;
    }

    return result;
  }

  /** 根据周期配置计算精确路径并查找已有文件。 */
  findNote(type: PeriodType, date: Moment): TFile | null {
    const settings = this.getSettings(type);
    const path = this.getNotePath(date, settings);
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }

  /** 创建笔记及缺失的父目录，并在写入前展开模板变量。 */
  async createNote(type: PeriodType, date: Moment): Promise<TFile> {
    const settings = this.getSettings(type);
    const path = this.getNotePath(date, settings);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      return existing;
    }

    await this.ensureParentFolder(path);
    const template = await this.readTemplate(settings.template);
    const title = path.split("/").pop()?.replace(/\.md$/i, "") ?? date.format(settings.format);
    const content = this.applyTemplate(template, title, date, type);
    return this.app.vault.create(path, content);
  }

  /** 优先使用 Periodic Notes 日记配置，否则读取 Obsidian 核心插件配置。 */
  private getDailySettings(): PeriodicNoteSettings {
    const periodic = this.getPeriodicSettings("daily");
    if (periodic?.enabled) {
      return this.normalizeSettings(periodic, DEFAULT_DAILY_FORMAT);
    }

    // internalPlugins 尚未进入 Obsidian 公共 API，通过最小结构兼容不同版本。
    const appWithInternals = this.app as App & {
      internalPlugins?: {
        getPluginById?: (id: string) => InternalPluginRecord | null;
        plugins?: Record<string, InternalPluginRecord>;
      };
    };
    const registry = appWithInternals.internalPlugins;
    const dailyPlugin =
      registry?.getPluginById?.("daily-notes") ?? registry?.plugins?.["daily-notes"];
    const options = dailyPlugin?.instance?.options ?? {};

    return this.normalizeSettings(
      {
        ...options,
        enabled: dailyPlugin?.enabled ?? true,
      },
      DEFAULT_DAILY_FORMAT,
    );
  }

  /** 优先使用 Periodic Notes 周记配置，否则回退到本插件设置。 */
  private getWeeklySettings(): PeriodicNoteSettings {
    const periodic = this.getPeriodicSettings("weekly");
    if (periodic?.enabled) {
      return this.normalizeSettings(periodic, DEFAULT_WEEKLY_FORMAT);
    }

    const settings = this.getCalendarSettings();
    return {
      enabled: true,
      format: settings.weeklyNoteFormat || DEFAULT_WEEKLY_FORMAT,
      folder: settings.weeklyNoteFolder,
      template: settings.weeklyNoteTemplate,
    };
  }

  private getPeriodicSettings(
    type: "daily" | "weekly",
  ): Partial<PeriodicNoteSettings> | null {
    // 社区插件注册表不是公共类型；插件未安装或未启用时自然返回 null。
    const appWithPlugins = this.app as App & {
      plugins?: {
        getPlugin?: (id: string) => PeriodicNotesPlugin | null;
      };
    };
    return appWithPlugins.plugins?.getPlugin?.("periodic-notes")?.settings?.[type] ?? null;
  }

  /** 清洗可选配置，并为缺失字段补齐稳定默认值。 */
  private normalizeSettings(
    settings: Partial<PeriodicNoteSettings>,
    defaultFormat: string,
  ): PeriodicNoteSettings {
    return {
      enabled: settings.enabled ?? true,
      format: settings.format || defaultFormat,
      folder: this.cleanFolder(settings.folder ?? ""),
      template: settings.template ?? "",
    };
  }

  /** 将根目录、首尾斜杠和空白统一为内部使用的相对目录格式。 */
  private cleanFolder(folder: string): string {
    if (!folder.trim() || folder.trim() === "/") {
      return "";
    }
    return normalizePath(folder.trim()).replace(/^\/+|\/+$/g, "");
  }

  /** 获取文件相对于配置目录且不含 .md 后缀的路径。 */
  private getRelativeStem(file: TFile, folder: string): string | null {
    const stem = file.path.replace(/\.md$/i, "");
    const normalizedFolder = this.cleanFolder(folder);
    if (!normalizedFolder) {
      return stem;
    }
    const prefix = `${normalizedFolder}/`;
    return stem.startsWith(prefix) ? stem.slice(prefix.length) : null;
  }

  /** 根据 Moment 格式和目录生成规范化的仓库相对路径。 */
  private getNotePath(date: Moment, settings: PeriodicNoteSettings): string {
    const relativePath = `${date.format(settings.format)}.md`;
    return normalizePath(
      settings.folder ? `${settings.folder}/${relativePath}` : relativePath,
    );
  }

  /** 逐级创建父目录，并在同名路径已被文件占用时给出明确错误。 */
  private async ensureParentFolder(filePath: string): Promise<void> {
    const parts = filePath.split("/").slice(0, -1);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (existing instanceof TFolder) {
        continue;
      }
      if (existing) {
        throw new Error(this.i18n.t("error.folderOccupied", { path: current }));
      }
      await this.app.vault.createFolder(current);
    }
  }

  /** 支持 wiki 链接解析和直接路径两种模板定位方式。 */
  private async readTemplate(templatePath: string): Promise<string> {
    if (!templatePath.trim()) {
      return "";
    }

    const normalized = normalizePath(templatePath.trim());
    const linked = this.app.metadataCache.getFirstLinkpathDest(normalized, "");
    const direct = this.app.vault.getAbstractFileByPath(
      normalized.endsWith(".md") ? normalized : `${normalized}.md`,
    );
    const template = linked ?? (direct instanceof TFile ? direct : null);
    return template ? this.app.vault.cachedRead(template) : "";
  }

  /**
   * 展开 Obsidian 常见的 title/date/time 变量；周记额外支持
   * {{monday:格式}} 等按当前周首日计算的星期变量。
   */
  private applyTemplate(
    template: string,
    title: string,
    date: Moment,
    type: PeriodType,
  ): string {
    const now = moment();
    let result = template
      .replace(/{{title}}/gi, title)
      .replace(/{{date(?::([^}]+))?}}/gi, (_match, format?: string) =>
        date.format(format || DEFAULT_DAILY_FORMAT),
      )
      .replace(/{{time(?::([^}]+))?}}/gi, (_match, format?: string) =>
        now.format(format || "HH:mm"),
      );

    if (type === "week") {
      const weekStart = this.getCalendarSettings().weekStart;
      const weekStartIndex = getWeekStartIndex(weekStart);
      for (const [dayIndex, dayName] of WEEKDAY_NAMES.entries()) {
        const offset = (dayIndex - weekStartIndex + 7) % 7;
        const targetDate = date.clone().add(offset, "days");
        const pattern = new RegExp(`{{${dayName}:([^}]+)}}`, "gi");
        result = result.replace(pattern, (_match, format: string) =>
          targetDate.format(format),
        );
      }
    }

    return result;
  }
}
