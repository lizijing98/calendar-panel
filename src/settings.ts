import {
  App,
  PluginSettingTab,
  type SettingDefinitionItem,
  type TFile,
} from "obsidian";

import {
  DEFAULT_WEEKLY_FORMAT,
  WEEKDAY_NAMES,
} from "./constants";
import type CalendarPlugin from "./main";
import { moment } from "./moment";
import type { CalendarSettings } from "./types";

export const DEFAULT_SETTINGS: CalendarSettings = {
  uiLanguage: "system-default",
  weekStart: "locale",
  shouldConfirmBeforeCreate: true,
  showWeekNumbers: false,
  weeklyNoteFormat: DEFAULT_WEEKLY_FORMAT,
  weeklyNoteTemplate: "",
  weeklyNoteFolder: "",
  localeOverride: "system-default",
};

type CalendarSettingKey = keyof CalendarSettings;

/** 使用 Obsidian SettingDefinition API 构建的插件设置页。 */
export class CalendarSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: CalendarPlugin,
  ) {
    super(app, plugin);
  }

  /**
   * 动态生成设置项：星期名称和语言列表均来自当前 Moment 区域数据，
   * 周记配置仅在启用周数时显示。
   */
  getSettingDefinitions(): SettingDefinitionItem<CalendarSettingKey>[] {
    const t = this.plugin.i18n.t.bind(this.plugin.i18n);
    const localizedWeekdays = moment.weekdays();
    const localeStart = moment.localeData().firstDayOfWeek();
    const weekStartOptions: Record<string, string> = {
      locale: t("settings.weekStart.locale", {
        weekday: localizedWeekdays[localeStart] ?? "",
      }),
    };
    WEEKDAY_NAMES.forEach((weekday, index) => {
      weekStartOptions[weekday] = localizedWeekdays[index] ?? weekday;
    });

    const localeOptions: Record<string, string> = {
      "system-default": t("settings.language.system"),
    };
    moment.locales().forEach((locale) => {
      localeOptions[locale] = locale;
    });

    return [
      {
        type: "group",
        heading: t("settings.general"),
        items: [
          {
            name: t("settings.interfaceLanguage.name"),
            desc: t("settings.interfaceLanguage.desc"),
            control: {
              type: "dropdown",
              key: "uiLanguage",
              defaultValue: "system-default",
              options: {
                "system-default": t("settings.language.system"),
                "zh-CN": t("settings.language.zhCN"),
                en: t("settings.language.en"),
              },
            },
          },
          {
            name: t("settings.weekStart.name"),
            desc: t("settings.weekStart.desc"),
            control: {
              type: "dropdown",
              key: "weekStart",
              defaultValue: "locale",
              options: weekStartOptions,
            },
          },
          {
            name: t("settings.confirmCreate.name"),
            desc: t("settings.confirmCreate.desc"),
            control: {
              type: "toggle",
              key: "shouldConfirmBeforeCreate",
              defaultValue: true,
            },
          },
          {
            name: t("settings.showWeekNumbers.name"),
            desc: t("settings.showWeekNumbers.desc"),
            control: {
              type: "toggle",
              key: "showWeekNumbers",
              defaultValue: false,
            },
          },
        ],
      },
      {
        type: "group",
        heading: t("settings.weekly"),
        visible: () => this.plugin.settings.showWeekNumbers,
        items: [
          {
            name: t("settings.weeklyFormat.name"),
            desc: t("settings.weeklyFormat.desc"),
            control: {
              type: "text",
              key: "weeklyNoteFormat",
              defaultValue: DEFAULT_WEEKLY_FORMAT,
              placeholder: DEFAULT_WEEKLY_FORMAT,
              disabled: () => this.plugin.hasPeriodicWeeklyNotes(),
            },
          },
          {
            name: t("settings.weeklyFolder.name"),
            desc: t("settings.weeklyFolder.desc"),
            control: {
              type: "folder",
              key: "weeklyNoteFolder",
              defaultValue: "",
              includeRoot: true,
              disabled: () => this.plugin.hasPeriodicWeeklyNotes(),
            },
          },
          {
            name: t("settings.weeklyTemplate.name"),
            desc: t("settings.weeklyTemplate.desc"),
            control: {
              type: "file",
              key: "weeklyNoteTemplate",
              defaultValue: "",
              filter: (file: TFile) => file.extension === "md",
              disabled: () => this.plugin.hasPeriodicWeeklyNotes(),
            },
          },
        ],
      },
      {
        type: "group",
        heading: t("settings.advanced"),
        items: [
          {
            name: t("settings.localeOverride.name"),
            desc: t("settings.localeOverride.desc"),
            control: {
              type: "dropdown",
              key: "localeOverride",
              defaultValue: "system-default",
              options: localeOptions,
            },
          },
        ],
      },
    ];
  }

  /** SettingDefinition API 读取控件初始值的统一入口。 */
  getControlValue(key: string): unknown {
    return this.plugin.settings[key as CalendarSettingKey];
  }

  /** 持久化单项设置，并刷新依赖 visible/disabled 的控件状态。 */
  async setControlValue(key: string, value: unknown): Promise<void> {
    const settingKey = key as CalendarSettingKey;
    await this.plugin.updateSettings({
      [settingKey]: value,
    });
    if (settingKey === "uiLanguage") {
      this.update();
    } else {
      this.refreshDomState();
    }
  }
}
