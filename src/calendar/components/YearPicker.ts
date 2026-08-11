import { defineComponent, h, type PropType } from "vue";

import { translate } from "../../i18n";
import type { UiLocale } from "../../types";
import { activateOnKeyboard } from "../keyboard";

/** 以 5 行 × 4 列网格展示连续 20 年的选择组件。 */
export const YearPicker = defineComponent({
  name: "YearPicker",
  props: {
    locale: {
      type: String as PropType<UiLocale>,
      required: true,
    },
    // 当前年份窗口内的 20 个连续年份。
    years: {
      type: Array as PropType<number[]>,
      required: true,
    },
    // 当前日历正在显示的年份，用于标记选中项。
    selectedYear: {
      type: Number,
      required: true,
    },
    // 当前年份窗口的起始年份，用于无障碍描述。
    windowStart: {
      type: Number,
      required: true,
    },
  },
  emits: {
    // 返回用户选择的完整年份。
    select: (_year: number) => true,
  },
  setup(props, { emit }) {
    const t = (
      key: Parameters<typeof translate>[1],
      params?: Parameters<typeof translate>[2],
    ): string => translate(props.locale, key, params);

    return () =>
      h(
        "table",
        {
          class: "calendar-vue__selector-table calendar-vue__selector-table--years",
          "aria-label": t("calendar.selectYearRange", {
            start: props.windowStart,
            end: props.windowStart + 19,
          }),
        },
        h(
          "tbody",
          Array.from({ length: 5 }, (_, rowIndex) =>
            h(
              "tr",
              { key: rowIndex },
              props.years.slice(rowIndex * 4, rowIndex * 4 + 4).map((year) => {
                const select = (): void => emit("select", year);
                return h("td", { class: "calendar-vue__selector-cell", key: year }, [
                  h(
                    "div",
                    {
                      class: [
                        "calendar-vue__selector-option",
                        year === props.selectedYear ? "is-current" : "",
                      ],
                      role: "button",
                      tabindex: 0,
                      "aria-label": t("calendar.selectYearOption", { year }),
                      onClick: select,
                      onKeydown: (event: KeyboardEvent) =>
                        activateOnKeyboard(event, select),
                    },
                    String(year),
                  ),
                ]);
              }),
            ),
          ),
        ),
      );
  },
});
