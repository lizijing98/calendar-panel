import { defineComponent, h, type PropType } from "vue";

import { translate } from "../../i18n";
import type { UiLocale } from "../../types";

/** 展示日记、关联笔记和待办状态的图例。 */
export const CalendarLegend = defineComponent({
  name: "CalendarLegend",
  props: {
    locale: {
      type: String as PropType<UiLocale>,
      required: true,
    },
  },
  setup(props) {
    const t = (
      key: Parameters<typeof translate>[1],
      params?: Parameters<typeof translate>[2],
    ): string => translate(props.locale, key, params);

    return () =>
      h("div", { class: "calendar-vue__legend", "aria-label": t("calendar.legend") }, [
        h("span", { class: "calendar-vue__legend-item" }, [
          h("span", {
            class: "calendar-vue__dot calendar-vue__dot--filled",
            "aria-hidden": "true",
          }),
          h("span", t("calendar.dailyNote")),
        ]),
        h("span", { class: "calendar-vue__legend-item" }, [
          h("span", {
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
      ]);
  },
});
