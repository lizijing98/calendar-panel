import type { Moment } from "moment";
import type { TFile } from "obsidian";

import type { WEEKDAY_NAMES } from "./constants";

export type WeekdayName = (typeof WEEKDAY_NAMES)[number];
export type WeekStartOption = "locale" | WeekdayName;
export type PeriodType = "day" | "week";
export type UiLocale = "zh-CN" | "en";
export type UiLanguageOption = "system-default" | UiLocale;

/** 插件持久化设置。 */
export interface CalendarSettings {
  /** 插件界面语言；system-default 表示跟随 Obsidian。 */
  uiLanguage: UiLanguageOption;
  /** 每周起始日；locale 表示跟随当前区域。 */
  weekStart: WeekStartOption;
  /** 创建不存在的日记或周记前是否弹出确认框。 */
  shouldConfirmBeforeCreate: boolean;
  /** 是否显示可交互的周数列。 */
  showWeekNumbers: boolean;
  /** 未由 Periodic Notes 接管时使用的周记 Moment 格式。 */
  weeklyNoteFormat: string;
  /** 周记模板的仓库相对路径。 */
  weeklyNoteTemplate: string;
  /** 周记所在的仓库相对目录。 */
  weeklyNoteFolder: string;
  /** Moment 区域名称；system-default 表示跟随 Obsidian。 */
  localeOverride: string;
}

/** 统一后的 Daily Notes / Periodic Notes 周期笔记设置。 */
export interface PeriodicNoteSettings {
  enabled: boolean;
  format: string;
  folder: string;
  template: string;
}

/** 日历显示所需的笔记派生元数据。 */
export interface NoteMetadata {
  hasIncompleteTasks: boolean;
  tags: string[];
  emojiTag: string | null;
  cacheKey: string;
}

/** 日期网格中的单个日期。 */
export interface CalendarDay {
  date: Moment;
  id: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/** 日期网格中的一整周。 */
export interface CalendarWeek {
  id: string;
  weekNumber: number;
  start: Moment;
  days: CalendarDay[];
}

/** CalendarView 与 Vue 组件共享的响应式状态。 */
export interface CalendarState {
  /** 当前显示月份，使用 YYYY-MM-DD 保存以便跨组件序列化。 */
  displayedMonth: string;
  /** 当前自然日 ID。 */
  today: string;
  /** Obsidian 当前活动文件对应的日/周 ID。 */
  selectedId: string | null;
  dailyNotes: Record<string, TFile>;
  weeklyNotes: Record<string, TFile>;
  /** Frontmatter 中包含可见日期的普通笔记，按 YYYY-MM-DD 分组。 */
  datedNotes: Record<string, TFile[]>;
  metadata: Record<string, NoteMetadata>;
  settings: CalendarSettings;
  /** 已解析为中文或英文的实际界面语言。 */
  uiLocale: UiLocale;
  /** 文件或设置变化时递增，用于主动触发元数据刷新。 */
  revision: number;
}

/** Vue 展示层可调用的 Obsidian 宿主操作。 */
export interface CalendarController {
  /** 按月移动，负数向前、正数向后。 */
  changeMonth(delta: number): void;
  /** 设置 0～11 的月份索引。 */
  setDisplayedMonth(month: number): void;
  setDisplayedYear(year: number): void;
  showToday(): void;
  /** 打开或创建周期笔记；inNewSplit 表示是否在新分栏打开。 */
  openDay(date: Moment, inNewSplit: boolean): Promise<void>;
  openWeek(date: Moment, inNewSplit: boolean): Promise<void>;
  showFileMenu(file: TFile, event: MouseEvent): void;
  showHoverPreview(file: TFile, event: MouseEvent, target: HTMLElement): void;
  loadMetadata(files: TFile[]): Promise<void>;
  loadDatedNotes(dateIds: string[]): Promise<void>;
  openNote(file: TFile, inNewSplit: boolean): Promise<void>;
}
