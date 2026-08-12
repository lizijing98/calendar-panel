import { defineComponent, h, type PropType, type VNode } from "vue";

import { translate } from "../../i18n";
import type { UiLocale } from "../../types";
import { activateOnKeyboard } from "../keyboard";

export type CalendarMode = "days" | "months" | "years";
type NavigationDirection = "previous" | "next";

const ARROW_PATH =
  "M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z";

/**
 * 日历顶部导航组件。
 *
 * 展示当前月份/年份、笔记状态图例和导航控制器；导航事件的具体含义
 * 由当前 mode 决定，并交由根组件更新状态。
 */
export const CalendarHeader = defineComponent({
  name: "CalendarHeader",
  props: {
    locale: {
      type: String as PropType<UiLocale>,
      required: true,
    },
    // 当前面板模式：日期网格、月份选择或年份选择。
    mode: {
      type: String as PropType<CalendarMode>,
      required: true,
    },
    // 当前月份的本地化简称，例如“8月”或“Aug”。
    monthLabel: {
      type: String,
      required: true,
    },
    // 当前显示的完整年份。
    year: {
      type: Number,
      required: true,
    },
    // 年份选择器当前 20 年窗口的首年。
    yearWindowStart: {
      type: Number,
      required: true,
    },
  },
  emits: {
    // 切换选择器、移动当前时间范围及返回今天。
    selectMonth: () => true,
    selectYear: () => true,
    navigate: (_direction: NavigationDirection) => true,
    today: () => true,
  },
  setup(props, { emit }) {
    const t = (
      key: Parameters<typeof translate>[1],
      params?: Parameters<typeof translate>[2],
    ): string => translate(props.locale, key, params);

    /** 根据当前模式生成准确的导航提示文本。 */
    const getNavigationLabel = (direction: NavigationDirection): string => {
      if (props.mode === "years") {
        return t(
          direction === "previous"
            ? "calendar.previousYearWindow"
            : "calendar.nextYearWindow",
        );
      }
      if (props.mode === "months") {
        return t(
          direction === "previous"
            ? "calendar.previousYear"
            : "calendar.nextYear",
        );
      }
      return t(
        direction === "previous"
          ? "calendar.previousMonth"
          : "calendar.nextMonth",
      );
    };

    /** 渲染同时支持鼠标与键盘操作的前进/后退箭头。 */
    const renderArrow = (direction: NavigationDirection): VNode => {
      const activate = (): void => emit("navigate", direction);
      return h(
        "div",
        {
          class: [
            "calendar-vue__nav-control",
            direction === "next" ? "calendar-vue__nav-control--next" : "",
          ],
          role: "button",
          tabindex: 0,
          title: getNavigationLabel(direction),
          "aria-label": getNavigationLabel(direction),
          onClick: activate,
          onKeydown: (event: KeyboardEvent) =>
            activateOnKeyboard(event, activate),
        },
        h(
          "svg",
          {
            focusable: "false",
            "aria-hidden": "true",
            viewBox: "0 0 320 512",
            xmlns: "http://www.w3.org/2000/svg",
          },
          h("path", { d: ARROW_PATH, fill: "currentColor" }),
        ),
      );
    };

    return () =>
      h("header", { class: "calendar-vue__header" }, [
        h(
          "h2",
          { class: "calendar-vue__month-title" },
          props.mode === "years"
            ? h(
              "span",
              { class: "calendar-vue__year-window" },
              `${props.yearWindowStart}–${props.yearWindowStart + 19}`,
            )
            : [
              h(
                "span",
                {
                  class: "calendar-vue__month",
                  role: "button",
                  tabindex: 0,
                  title: t("calendar.selectMonth"),
                  "aria-label": t("calendar.selectMonth"),
                  "aria-pressed": props.mode === "months" ? "true" : "false",
                  onClick: () => emit("selectMonth"),
                  onKeydown: (event: KeyboardEvent) =>
                    activateOnKeyboard(event, () => emit("selectMonth")),
                },
                props.monthLabel,
              ),
              " ",
              h(
                "span",
                {
                  class: "calendar-vue__year",
                  role: "button",
                  tabindex: 0,
                  title: t("calendar.selectYear"),
                  "aria-label": t("calendar.selectYear"),
                  "aria-pressed": "false",
                  onClick: () => emit("selectYear"),
                  onKeydown: (event: KeyboardEvent) =>
                    activateOnKeyboard(event, () => emit("selectYear")),
                },
                String(props.year),
              ),
            ],
        ),
        h("div", { class: "calendar-vue__header-actions" }, [
          h("div", { class: "calendar-vue__legend", "aria-label": t("calendar.legend") }, [
            h("span", { class: "calendar-vue__legend-item" }, [
              h("span", {
                class: "calendar-vue__dot calendar-vue__dot--filled",
                "aria-hidden": "true",
              }),
              h("span", t("calendar.dailyNote")),
            ]),
            h("span", { class: "calendar-vue__legend-item" }, [
              h("span",
                {
                  class: "calendar-vue__dot calendar-vue__dot--note",
                  "aria-hidden": "true",
                }),
              h("span", t("calendar.note")),
            ]),
            h("span", { class: "calendar-vue__legend-item" }, [
              h("span", {
                class: "calendar-vue__dot calendar-vue__dot--task",
                "aria-hidden": "true",
              }),
              h("span", t("calendar.todo")),
            ]),
          ]),
          h("div", { class: "calendar-vue__right-nav" }, [
            renderArrow("previous"),
            h(
              "div",
              {
                class: "calendar-vue__today-control",
                role: "button",
                tabindex: 0,
                title: t("calendar.backToToday"),
                "aria-label": t("calendar.backToToday"),
                onClick: () => emit("today"),
                onKeydown: (event: KeyboardEvent) =>
                  activateOnKeyboard(event, () => emit("today")),
              },
              t("calendar.today"),
            ),
            renderArrow("next"),
          ]),
        ]),
      ]);
  },
});
