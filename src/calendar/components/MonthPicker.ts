import { defineComponent, h, type PropType } from "vue";

import { translate } from "../../i18n";
import type { UiLocale } from "../../types";
import { activateOnKeyboard } from "../keyboard";

/** 以 3 行 × 4 列网格展示全年月份的选择组件。 */
export const MonthPicker = defineComponent({
  name: "MonthPicker",
  props: {
    locale: {
      type: String as PropType<UiLocale>,
      required: true,
    },
    // 按 1 月至 12 月顺序排列的本地化月份简称。
    labels: {
      type: Array as PropType<string[]>,
      required: true,
    },
    // 当前月份的零基索引（0 表示一月）。
    selectedMonth: {
      type: Number,
      required: true,
    },
    // 月份选择器当前所属年份，用于无障碍描述。
    year: {
      type: Number,
      required: true,
    },
  },
  emits: {
    // 返回零基月份索引。
    select: (_month: number) => true,
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
          class: "calendar-vue__selector-table calendar-vue__selector-table--months",
          "aria-label": t("calendar.selectMonthsForYear", { year: props.year }),
        },
        h(
          "tbody",
          Array.from({ length: 3 }, (_, rowIndex) =>
            h(
              "tr",
              { key: rowIndex },
              Array.from({ length: 4 }, (_, columnIndex) => {
                const monthIndex = rowIndex * 4 + columnIndex;
                const label = props.labels[monthIndex] ?? String(monthIndex + 1);
                const select = (): void => emit("select", monthIndex);
                return h("td", { class: "calendar-vue__selector-cell", key: monthIndex }, [
                  h(
                    "div",
                    {
                      class: [
                        "calendar-vue__selector-option",
                        monthIndex === props.selectedMonth ? "is-current" : "",
                      ],
                      role: "button",
                      tabindex: 0,
                      "aria-label": t("calendar.selectMonthOption", { month: label }),
                      onClick: select,
                      onKeydown: (event: KeyboardEvent) =>
                        activateOnKeyboard(event, select),
                    },
                    label,
                  ),
                ]);
              }),
            ),
          ),
        ),
      );
  },
});
