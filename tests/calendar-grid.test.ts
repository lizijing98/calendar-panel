import momentFactory from "moment";
import type { VNode } from "vue";
import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ getLanguage: () => "en" }));

import { CalendarGrid } from "../src/calendar/components/CalendarGrid";
import type {
  CalendarController,
  CalendarDay,
  CalendarState,
  CalendarWeek,
} from "../src/types";

function findVNodeByClass(node: unknown, className: string): VNode | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findVNodeByClass(child, className);
      if (match) return match;
    }
    return null;
  }
  if (typeof node !== "object" || node === null || !("type" in node)) {
    return null;
  }

  const vnode = node as VNode;
  const vnodeProps: unknown = vnode.props;
  const classValue =
    typeof vnodeProps === "object" && vnodeProps !== null && "class" in vnodeProps
      ? vnodeProps.class
      : undefined;
  const classes = Array.isArray(classValue)
    ? classValue.flat(Infinity)
    : typeof classValue === "string"
      ? classValue.split(/\s+/)
      : [];
  if (classes.includes(className)) return vnode;

  return findVNodeByClass(vnode.children, className);
}

function isMouseEventHandler(
  value: unknown,
): value is (event: MouseEvent) => void {
  return typeof value === "function";
}

function renderGrid(hasDailyNote: boolean): {
  root: VNode;
  day: CalendarDay;
  openDay: ReturnType<typeof vi.fn>;
} {
  const day: CalendarDay = {
    id: "2026-08-21",
    date: momentFactory("2026-08-21"),
    isCurrentMonth: true,
    isToday: true,
  };
  const week: CalendarWeek = {
    id: "week:2026-08-17",
    weekNumber: 34,
    start: momentFactory("2026-08-17"),
    days: [day],
  };
  const dailyFile = {
    path: "Daily/2026-08-21.md",
    basename: "2026-08-21",
  };
  const state = {
    dailyNotes: hasDailyNote ? { [day.id]: dailyFile } : {},
    weeklyNotes: {},
    datedNotes: {},
    metadata: {},
    selectedId: null,
    settings: { showWeekNumbers: true },
    uiLocale: "en",
  } as unknown as CalendarState;
  const openDay = vi.fn().mockResolvedValue(undefined);
  const controller = {
    openDay,
    openWeek: vi.fn().mockResolvedValue(undefined),
    showHoverPreview: vi.fn(),
  } as unknown as CalendarController;
  const setup = CalendarGrid.setup as unknown as (
    props: Record<string, unknown>,
    context: { emit: ReturnType<typeof vi.fn> },
  ) => () => VNode;
  const render = setup(
    {
      weeks: [week],
      weekdayLabels: ["Fr"],
      state,
      controller,
      selectedDayId: null,
    },
    { emit: vi.fn() },
  );

  return { root: render(), day, openDay };
}

describe("日历表格交互", () => {
  it.each([false, true])("双击日期格调用日记打开流程（已有日记：%s）", (hasNote) => {
    const { root, day, openDay } = renderGrid(hasNote);
    const dayNode = findVNodeByClass(root, "calendar-vue__day");
    const dayProps = dayNode?.props as Record<string, unknown> | null;
    const event = { metaKey: false, ctrlKey: false } as MouseEvent;

    expect(dayNode).not.toBeNull();
    expect(dayProps?.onContextmenu).toBeUndefined();
    expect(dayProps?.onDblclick).toBeTypeOf("function");
    const onDblclick = dayProps?.onDblclick;
    if (isMouseEventHandler(onDblclick)) {
      onDblclick(event);
    }

    expect(openDay).toHaveBeenCalledOnce();
    expect(openDay).toHaveBeenCalledWith(day.date, false);
  });

  it("日期格和周序号格均不再注册右键事件", () => {
    const { root } = renderGrid(true);
    const dayNode = findVNodeByClass(root, "calendar-vue__day");
    const weekNode = findVNodeByClass(root, "calendar-vue__week");
    const dayProps = dayNode?.props as Record<string, unknown> | null;
    const weekProps = weekNode?.props as Record<string, unknown> | null;

    expect(dayNode).not.toBeNull();
    expect(weekNode).not.toBeNull();
    expect(dayProps?.onContextmenu).toBeUndefined();
    expect(weekProps?.onContextmenu).toBeUndefined();
  });
});
