import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ getLanguage: () => "en" }));

import { CalendarI18n, resolveUiLocale, translate } from "../src/i18n";

describe("界面多语言", () => {
  it("跟随 Obsidian 时将中文区域映射为中文，其他区域回退为英文", () => {
    expect(resolveUiLocale("system-default", "zh-cn")).toBe("zh-CN");
    expect(resolveUiLocale("system-default", "zh-TW")).toBe("zh-CN");
    expect(resolveUiLocale("system-default", "en")).toBe("en");
    expect(resolveUiLocale("system-default", "fr")).toBe("en");
  });

  it("手动选择语言时不受 Obsidian 当前语言影响", () => {
    expect(resolveUiLocale("zh-CN", "en")).toBe("zh-CN");
    expect(resolveUiLocale("en", "zh-cn")).toBe("en");
  });

  it("支持中英文文案和参数插值", () => {
    expect(translate("zh-CN", "details.dailyHeading", { date: "2026-08-11" }))
      .toBe("2026-08-11 日记");
    expect(translate("en", "details.dailyHeading", { date: "2026-08-11" }))
      .toBe("Daily note for 2026-08-11");
  });

  it("可以在运行时切换实际界面语言", () => {
    const i18n = new CalendarI18n("zh-CN");
    expect(i18n.t("calendar.today")).toBe("今天");

    i18n.setLanguage("en");
    expect(i18n.locale).toBe("en");
    expect(i18n.t("calendar.today")).toBe("Today");
  });
});
