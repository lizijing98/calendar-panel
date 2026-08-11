import { getLanguage } from "obsidian";

import type { UiLanguageOption, UiLocale } from "../types";
import { en } from "./locales/en";
import { zhCN } from "./locales/zh-CN";

export type TranslationKey = keyof typeof zhCN;
export type TranslationParams = Record<string, string | number>;

const messages: Record<UiLocale, Record<TranslationKey, string>> = {
  "zh-CN": zhCN,
  en,
};

/** 将设置值或 Obsidian 语言代码收敛为插件支持的中文或英文。 */
export function resolveUiLocale(
  language: UiLanguageOption,
  obsidianLanguage = getLanguage(),
): UiLocale {
  if (language !== "system-default") {
    return language;
  }
  return obsidianLanguage.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

/** 按指定语言读取文案并替换 {name} 形式的参数。 */
export function translate(
  locale: UiLocale,
  key: TranslationKey,
  params: TranslationParams = {},
): string {
  return messages[locale][key].replace(
    /\{(\w+)\}/g,
    (placeholder, name: string) => String(params[name] ?? placeholder),
  );
}

/** 轻量翻译器：提供类型安全的键、参数插值和运行时语言切换。 */
export class CalendarI18n {
  private currentLocale: UiLocale;

  constructor(language: UiLanguageOption = "system-default") {
    this.currentLocale = resolveUiLocale(language);
  }

  get locale(): UiLocale {
    return this.currentLocale;
  }

  setLanguage(language: UiLanguageOption): void {
    this.currentLocale = resolveUiLocale(language);
  }

  t(key: TranslationKey, params: TranslationParams = {}): string {
    return translate(this.currentLocale, key, params);
  }
}
