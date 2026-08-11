import { defineComponent, h, type PropType, type VNode } from "vue";

import { DATE_FORMAT } from "../../constants";
import { translate } from "../../i18n";
import type {
  CalendarController,
  CalendarDay,
  CalendarState,
  CalendarWeek,
  NoteMetadata,
} from "../../types";
import { activateOnKeyboard } from "../keyboard";

/**
 * 日期网格组件。
 *
 * 渲染星期标题、日期单元格及可选的周数列；实心圆点表示笔记存在，
 * 空心圆点表示该笔记含有未完成任务。
 */
export const CalendarGrid = defineComponent({
  name: "CalendarGrid",
  props: {
    // 当前月份覆盖的周数据（包含月初/月末相邻月份日期）。
    weeks: {
      type: Array as PropType<CalendarWeek[]>,
      required: true,
    },
    // 按插件周首日配置排序后的本地化星期标题。
    weekdayLabels: {
      type: Array as PropType<string[]>,
      required: true,
    },
    // 笔记索引、元数据和插件设置等共享状态。
    state: {
      type: Object as PropType<CalendarState>,
      required: true,
    },
    // 将打开笔记、文件菜单和悬浮预览交给 Obsidian 视图宿主处理。
    controller: {
      type: Object as PropType<CalendarController>,
      required: true,
    },
    // 详情面板正在查看的日期，与 Obsidian 当前打开文件的 selectedId 分离。
    selectedDayId: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: {
    // 用户左键选择日期，仅更新下方详情面板，不立即打开文件。
    selectDay: (_day: CalendarDay) => true,
  },
  setup(props, { emit }) {
    const t = (
      key: Parameters<typeof translate>[1],
      params?: Parameters<typeof translate>[2],
    ): string => translate(props.state.uiLocale, key, params);

    /** 根据笔记存在状态和未完成任务状态渲染实心、空心圆点。 */
    const renderDots = (
      hasNote: boolean,
      metadata: NoteMetadata | undefined,
    ): VNode => {
      const dots: VNode[] = [];
      if (hasNote) {
        dots.push(
          h("span", {
            class: "calendar-vue__dot calendar-vue__dot--filled",
            key: "note",
          }),
        );
      }
      if (metadata?.hasIncompleteTasks) {
        dots.push(
          h("span", {
            class: "calendar-vue__dot calendar-vue__dot--task",
            key: "task",
          }),
        );
      }
      return h("span", { class: "calendar-vue__dots", "aria-hidden": "true" }, dots);
    };

    /** 渲染单个日期；右键菜单和悬浮预览仅在日记存在时生效。 */
    const renderDay = (day: CalendarDay): VNode => {
      const file = props.state.dailyNotes[day.id];
      const metadata = file ? props.state.metadata[file.path] : undefined;
      const classes = ["calendar-vue__day"];
      if (!day.isCurrentMonth) classes.push("is-outside-month");
      if (day.isToday) classes.push("is-today");
      if (file) classes.push("has-note");
      if (props.state.selectedId === day.id) classes.push("is-selected");
      if (props.selectedDayId === day.id) classes.push("is-inspected");

      const attributes: Record<string, string> = {};
      if (metadata?.tags.length) attributes["data-tags"] = metadata.tags.join(" ");
      if (metadata?.emojiTag) attributes["data-emoji-tag"] = metadata.emojiTag;
      const select = (): void => emit("selectDay", day);
      const dateLabel = day.date.format(DATE_FORMAT);
      const noteStatus = t(
        file ? "calendar.dailyExists" : "calendar.dailyMissing",
      );
      const taskStatus = metadata?.hasIncompleteTasks
        ? t("calendar.incompleteTasksSuffix")
        : "";

      return h("td", {
        class: ["calendar-vue__cell", [0, 6].includes(day.date.day()) ? "is-weekend" : ""],
        key: day.id,
      }, [
        h(
          "div",
          {
            class: classes,
            role: "button",
            tabindex: 0,
            title: t("calendar.viewDailyNote", { date: dateLabel }),
            "aria-label": t("calendar.dayAria", {
              date: dateLabel,
              noteStatus,
              taskStatus,
            }),
            ...attributes,
            onClick: select,
            onKeydown: (event: KeyboardEvent) =>
              activateOnKeyboard(event, select),
            onContextmenu: (event: MouseEvent) => {
              if (!file) return;
              event.preventDefault();
              props.controller.showFileMenu(file, event);
            },
            onMouseenter: (event: MouseEvent) => {
              if (!file || (!event.metaKey && !event.ctrlKey)) return;
              props.controller.showHoverPreview(
                file,
                event,
                event.currentTarget as HTMLElement,
              );
            },
          },
          [
            h("span", { class: "calendar-vue__day-number" }, String(day.date.date())),
            metadata?.emojiTag
              ? h("span", { class: "calendar-vue__emoji", "aria-hidden": "true" }, metadata.emojiTag)
              : null,
            renderDots(Boolean(file), metadata),
          ],
        ),
      ]);
    };

    /** 渲染周数入口，点击后打开或创建该周周记。 */
    const renderWeekNumber = (week: CalendarWeek): VNode => {
      const file = props.state.weeklyNotes[week.id];
      const metadata = file ? props.state.metadata[file.path] : undefined;
      const selected = props.state.selectedId === week.id;
      const noteStatus = t(
        file ? "calendar.weeklyExists" : "calendar.weeklyMissing",
      );
      const taskStatus = metadata?.hasIncompleteTasks
        ? t("calendar.incompleteTasksSuffix")
        : "";
      return h("td", { class: "calendar-vue__week-cell" }, [
        h(
          "div",
          {
            class: ["calendar-vue__week", file ? "has-note" : "", selected ? "is-selected" : ""],
            role: "button",
            tabindex: 0,
            title: file
              ? t("calendar.openFile", { name: file.basename })
              : t("calendar.createWeeklyNote", { week: week.weekNumber }),
            "aria-label": t("calendar.weekAria", {
              week: week.weekNumber,
              noteStatus,
              taskStatus,
            }),
            onClick: (event: MouseEvent) =>
              void props.controller.openWeek(week.start, event.metaKey || event.ctrlKey),
            onKeydown: (event: KeyboardEvent) =>
              activateOnKeyboard(event, () => {
                void props.controller.openWeek(week.start, event.metaKey || event.ctrlKey);
              }),
            onContextmenu: (event: MouseEvent) => {
              if (!file) return;
              event.preventDefault();
              props.controller.showFileMenu(file, event);
            },
            onMouseenter: (event: MouseEvent) => {
              if (!file || (!event.metaKey && !event.ctrlKey)) return;
              props.controller.showHoverPreview(
                file,
                event,
                event.currentTarget as HTMLElement,
              );
            },
          },
          [
            h("span", { class: "calendar-vue__week-number" }, String(week.weekNumber)),
            renderDots(Boolean(file), metadata),
          ],
        ),
      ]);
    };

    return () =>
      h("table", { class: "calendar-vue__table" }, [
        h("thead", [
          h("tr", [
            props.state.settings.showWeekNumbers
              ? h(
                "th",
                {
                  class: "calendar-vue__week-heading",
                  scope: "col",
                  title: t("calendar.weekNumber"),
                },
                "W",
              )
              : null,
            ...props.weekdayLabels.map((label) =>
              h("th", { class: "calendar-vue__weekday", scope: "col", key: label }, label),
            ),
          ]),
        ]),
        h(
          "tbody",
          props.weeks.map((week) =>
            h("tr", { key: week.id }, [
              props.state.settings.showWeekNumbers ? renderWeekNumber(week) : null,
              ...week.days.map(renderDay),
            ]),
          ),
        ),
      ]);
  },
});
