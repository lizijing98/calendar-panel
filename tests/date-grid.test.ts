import momentFactory from "moment";
import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ moment: momentFactory }));

import {
  buildMonthGrid,
  getDateId,
  getWeekId,
  getWeekStartIndex,
  getWeekdayLabels,
  startOfConfiguredWeek,
} from "../src/calendar/date-grid";

describe("日期网格", () => {
  it("按周一作为一周起点时生成包含完整周的月份网格", () => {
    const month = momentFactory("2026-08-01");
    const weeks = buildMonthGrid(month, momentFactory("2026-08-10"), "monday");

    expect(weeks).toHaveLength(6);
    const firstDay = weeks[0]?.days[0];
    const lastDay = weeks[5]?.days[6];
    expect(firstDay).toBeDefined();
    expect(lastDay).toBeDefined();
    if (!firstDay || !lastDay) throw new Error("日历网格缺少首尾日期");
    expect(getDateId(firstDay.date)).toBe("2026-07-27");
    expect(getDateId(lastDay.date)).toBe("2026-09-06");
    expect(weeks.flatMap((week) => week.days)).toHaveLength(42);
  });

  it("正确标记今天、当月日期和相邻月份日期", () => {
    const weeks = buildMonthGrid(
      momentFactory("2026-08-01"),
      momentFactory("2026-08-10"),
      "monday",
    );
    const days = weeks.flatMap((week) => week.days);

    expect(days.find((day) => day.id === "2026-08-10")).toMatchObject({
      isCurrentMonth: true,
      isToday: true,
    });
    expect(days.find((day) => day.id === "2026-07-31")).toMatchObject({
      isCurrentMonth: false,
      isToday: false,
    });
  });

  it("按照配置计算一周的起始日期", () => {
    const date = momentFactory("2026-08-10");

    expect(getDateId(startOfConfiguredWeek(date, "sunday"))).toBe("2026-08-09");
    expect(getDateId(startOfConfiguredWeek(date, "monday"))).toBe("2026-08-10");
    expect(getWeekStartIndex("saturday")).toBe(6);
  });

  it("按照一周起点生成周标识和星期标题", () => {
    const date = momentFactory("2026-08-12");

    expect(getWeekId(date, "monday")).toBe("week:2026-08-10");
    expect(getWeekId(date, "sunday")).toBe("week:2026-08-09");
    expect(getWeekdayLabels("monday")).toEqual([
      "Mo",
      "Tu",
      "We",
      "Th",
      "Fr",
      "Sa",
      "Su",
    ]);
  });
});
