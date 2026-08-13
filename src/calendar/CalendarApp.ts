import {
  computed,
  defineComponent,
  h,
  ref,
  watch,
  type PropType,
} from "vue";
import type { TFile } from "obsidian";

import { CalendarGrid } from "./components/CalendarGrid";
import {
  CalendarHeader,
  type CalendarMode,
} from "./components/CalendarHeader";
import { CalendarLegend } from "./components/CalendarLegend";
import { DayDetails } from "./components/DayDetails";
import { MonthPicker } from "./components/MonthPicker";
import { YearPicker } from "./components/YearPicker";
import { buildMonthGrid, getWeekdayLabels } from "./date-grid";
import { moment } from "../moment";
import type {
  CalendarController,
  CalendarDay,
  CalendarState,
} from "../types";

/** 按文件路径去重，并过滤尚未创建的日期或周记文件。 */
function uniqueFiles(files: Array<TFile | undefined>): TFile[] {
  return Array.from(
    new Map(
      files
        .filter((file): file is TFile => Boolean(file))
        .map((file) => [file.path, file]),
    ).values(),
  );
}

/**
 * 日历视图的根组件。
 *
 * 负责在日期、月份和年份三种模式间编排子组件，并根据可见日期触发
 * 笔记元数据加载；实际的 Obsidian 文件操作统一交给 controller 完成。
 */
export const CalendarApp = defineComponent({
  name: "CalendarApp",
  props: {
    // CalendarView 提供的响应式数据快照。
    state: {
      type: Object as PropType<CalendarState>,
      required: true,
    },
    // 视图控制器，封装月份导航、笔记打开/创建及菜单等宿主能力。
    controller: {
      type: Object as PropType<CalendarController>,
      required: true,
    },
  },
  setup(props) {
    const displayedMonth = computed(() => moment(props.state.displayedMonth));
    const today = computed(() => moment(props.state.today));
    const selectedDayId = ref<string | null>(props.state.today);
    const calendarMode = ref<CalendarMode>("days");
    const yearWindowStart = ref(
      Math.floor(displayedMonth.value.year() / 20) * 20,
    );
    const weeks = computed(() =>
      buildMonthGrid(
        displayedMonth.value,
        today.value,
        props.state.settings.weekStart,
      ),
    );
    const weekdayLabels = computed(() =>
      getWeekdayLabels(props.state.settings.weekStart),
    );
    const selectedDay = computed(() =>
      weeks.value
        .flatMap((week) => week.days)
        .find((day) => day.id === selectedDayId.value) ?? null,
    );
    const yearWindow = computed(() =>
      Array.from({ length: 20 }, (_, index) => yearWindowStart.value + index),
    );

    /** 切换月份/年份选择器；再次点击当前模式时返回日期网格。 */
    const selectCalendarMode = (mode: Exclude<CalendarMode, "days">): void => {
      if (mode === "years") {
        yearWindowStart.value =
          Math.floor(displayedMonth.value.year() / 20) * 20;
      }
      calendarMode.value = calendarMode.value === mode ? "days" : mode;
    };

    /** 根据当前选择模式解释左右导航：月份、年份或 20 年窗口。 */
    const navigateCalendar = (direction: "previous" | "next"): void => {
      const delta = direction === "previous" ? -1 : 1;
      if (calendarMode.value === "years") {
        yearWindowStart.value += delta * 20;
        return;
      }
      if (calendarMode.value === "months") {
        props.controller.setDisplayedYear(displayedMonth.value.year() + delta);
        return;
      }
      props.controller.changeMonth(delta);
    };

    const showToday = (): void => {
      selectedDayId.value = props.state.today;
      calendarMode.value = "days";
      props.controller.showToday();
    };

    watch(
      () => [
        props.state.displayedMonth,
        props.state.revision,
        props.state.settings.showWeekNumbers,
      ],
      () => {
        // 仅加载当前网格日期所需的周期笔记元数据和 Frontmatter 日期关联。
        const visibleFiles: Array<TFile | undefined> = [];
        const visibleDateIds: string[] = [];
        for (const week of weeks.value) {
          visibleDateIds.push(...week.days.map((day) => day.id));
          visibleFiles.push(
            ...week.days.map((day) => props.state.dailyNotes[day.id]),
            props.state.weeklyNotes[week.id],
          );
        }
        void Promise.all([
          props.controller.loadMetadata(uniqueFiles(visibleFiles)),
          props.controller.loadDatedNotes(visibleDateIds),
        ]);
      },
      { immediate: true },
    );

    return () => {
      const day = selectedDay.value;
      return h("section", { id: "calendar-container", class: "calendar-vue" }, [
        h(CalendarHeader, {
          mode: calendarMode.value,
          locale: props.state.uiLocale,
          monthLabel: displayedMonth.value.format("MMM"),
          year: displayedMonth.value.year(),
          yearWindowStart: yearWindowStart.value,
          onSelectMonth: () => selectCalendarMode("months"),
          onSelectYear: () => selectCalendarMode("years"),
          onNavigate: navigateCalendar,
          onToday: showToday,
        }),
        calendarMode.value === "months"
          ? h(MonthPicker, {
            locale: props.state.uiLocale,
            labels: moment.monthsShort(),
            selectedMonth: displayedMonth.value.month(),
            year: displayedMonth.value.year(),
            onSelect: (month: number) => {
              props.controller.setDisplayedMonth(month);
              calendarMode.value = "days";
            },
          })
          : calendarMode.value === "years"
            ? h(YearPicker, {
              locale: props.state.uiLocale,
              years: yearWindow.value,
              selectedYear: displayedMonth.value.year(),
              windowStart: yearWindowStart.value,
              onSelect: (year: number) => {
                props.controller.setDisplayedYear(year);
                calendarMode.value = "days";
              },
            })
            : h(CalendarGrid, {
              weeks: weeks.value,
              weekdayLabels: weekdayLabels.value,
              state: props.state,
              controller: props.controller,
              selectedDayId: selectedDayId.value,
              onSelectDay: (selected: CalendarDay) => {
                selectedDayId.value = selected.id;
              },
            }),
        h(CalendarLegend, { locale: props.state.uiLocale }),
        day
          ? h(DayDetails, {
            day,
            file: props.state.dailyNotes[day.id],
            notes: props.state.datedNotes[day.id] ?? [],
            controller: props.controller,
            locale: props.state.uiLocale,
          })
          : null,
      ]);
    };
  },
});
