import { defineComponent, h, type PropType, type VNode } from "vue";

import { translate } from "../../i18n";
import type { UiLocale } from "../../types";
import { activateOnKeyboard } from "../keyboard";

export type CalendarMode = "days" | "months" | "years";
export type NavigationDirection = "previous" | "next";

const ARROW_PATH =
  "M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z";

/** 提供日历范围前后导航和返回今天的操作。 */
export const CalendarControls = defineComponent({
  name: "CalendarControls",
  props: {
    locale: {
      type: String as PropType<UiLocale>,
      required: true,
    },
    mode: {
      type: String as PropType<CalendarMode>,
      required: true,
    },
  },
  emits: {
    navigate: (_direction: NavigationDirection) => true,
    today: () => true,
  },
  setup(props, { emit }) {
    const t = (
      key: Parameters<typeof translate>[1],
      params?: Parameters<typeof translate>[2],
    ): string => translate(props.locale, key, params);

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

    const renderArrow = (direction: NavigationDirection): VNode => {
      const activate = (): void => emit("navigate", direction);
      const label = getNavigationLabel(direction);
      return h(
        "div",
        {
          class: [
            "calendar-vue__nav-control",
            direction === "next" ? "calendar-vue__nav-control--next" : "",
          ],
          role: "button",
          tabindex: 0,
          title: label,
          "aria-label": label,
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
      ]);
  },
});
