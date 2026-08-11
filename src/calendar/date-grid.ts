import type { Moment } from "moment";
import { moment } from "../moment";

import type {
  CalendarDay,
  CalendarWeek,
  WeekStartOption,
} from "../types";
import { DATE_FORMAT, WEEKDAY_NAMES } from "../constants";

/** 将区域设置或星期名称转换为 Moment 使用的 0（周日）～6（周六）。 */
export function getWeekStartIndex(option: WeekStartOption): number {
  if (option === "locale") {
    return moment.localeData().firstDayOfWeek();
  }
  return WEEKDAY_NAMES.indexOf(option);
}

/** 返回配置周首日所在日期的副本，不修改调用方传入的 Moment 对象。 */
export function startOfConfiguredWeek(
  date: Moment,
  option: WeekStartOption,
): Moment {
  const startIndex = getWeekStartIndex(option);
  const offset = (date.day() - startIndex + 7) % 7;
  return date.clone().subtract(offset, "days").startOf("day");
}

/** 生成日记索引使用的稳定日期 ID。 */
export function getDateId(date: Moment): string {
  return date.format(DATE_FORMAT);
}

/** 生成带 week: 前缀的周记索引 ID，避免与日记 ID 冲突。 */
export function getWeekId(date: Moment, option: WeekStartOption): string {
  return `week:${getDateId(startOfConfiguredWeek(date, option))}`;
}

/** 按当前 Moment 区域规则获取周数。 */
export function getWeekNumber(date: Moment, _option: WeekStartOption): number {
  return date.week();
}

/** 从配置周首日起旋转本地化的星期简称。 */
export function getWeekdayLabels(option: WeekStartOption): string[] {
  const labels = moment.weekdaysMin();
  const startIndex = getWeekStartIndex(option);
  return Array.from(
    { length: 7 },
    (_, index) => labels[(startIndex + index) % 7] ?? "",
  );
}

/**
 * 构建覆盖目标月份的完整周网格。
 * 月初和月末所在周会包含相邻月份日期，因此结果始终以完整的 7 天为一行。
 */
export function buildMonthGrid(
  displayedMonth: Moment,
  today: Moment,
  option: WeekStartOption,
): CalendarWeek[] {
  const month = displayedMonth.clone().startOf("month");
  const gridStart = startOfConfiguredWeek(month, option);
  const monthEnd = displayedMonth.clone().endOf("month");
  const finalWeekStart = startOfConfiguredWeek(monthEnd, option);
  const weekCount = finalWeekStart.diff(gridStart, "weeks") + 1;

  return Array.from({ length: weekCount }, (_, weekIndex) => {
    const start = gridStart.clone().add(weekIndex, "weeks");
    const days: CalendarDay[] = Array.from({ length: 7 }, (_, dayIndex) => {
      const date = start.clone().add(dayIndex, "days");
      return {
        date,
        id: getDateId(date),
        isCurrentMonth: date.month() === month.month() && date.year() === month.year(),
        isToday: date.isSame(today, "day"),
      };
    });

    return {
      id: getWeekId(start, option),
      weekNumber: getWeekNumber(start, option),
      start,
      days,
    };
  });
}
