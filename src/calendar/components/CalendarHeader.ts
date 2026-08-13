import { defineComponent, h, type PropType } from "vue";

import { translate } from "../../i18n";
import type { UiLocale } from "../../types";
import { activateOnKeyboard } from "../keyboard";
import {
  CalendarControls,
  type CalendarMode,
  type NavigationDirection,
} from "./CalendarControls";

export type { CalendarMode } from "./CalendarControls";

/**
 * 日历顶部导航组件。
 *
 * 展示当前月份/年份和导航控制器；导航事件的具体含义由当前 mode
 * 决定，并交由根组件更新状态。
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
          h(CalendarControls, {
            locale: props.locale,
            mode: props.mode,
            onNavigate: (direction: NavigationDirection) =>
              emit("navigate", direction),
            onToday: () => emit("today"),
          }),
        ]),
      ]);
  },
});
