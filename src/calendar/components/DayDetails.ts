import { defineComponent, h, type PropType } from "vue";
import type { TFile } from "obsidian";

import { DATE_FORMAT } from "../../constants";
import { translate } from "../../i18n";
import type { CalendarController, CalendarDay, UiLocale } from "../../types";
import { activateOnKeyboard } from "../keyboard";

/**
 * 选中日期的详情组件。
 *
 * 日记不存在时提供创建入口；存在时展示文件名和路径，并支持打开与右键菜单。
 */
export const DayDetails = defineComponent({
  name: "DayDetails",
  props: {
    locale: {
      type: String as PropType<UiLocale>,
      required: true,
    },
    // 当前在日历中选中的日期。
    day: {
      type: Object as PropType<CalendarDay>,
      required: true,
    },
    // 对应的日记文件；undefined 表示尚未创建。
    file: {
      type: Object as PropType<TFile | undefined>,
      default: undefined,
    },
    // Frontmatter 中包含当前日期的普通笔记，已排除上方日记。
    notes: {
      type: Array as PropType<TFile[]>,
      default: () => [],
    },
    // 负责创建、打开日记及显示文件菜单的 Obsidian 视图控制器。
    controller: {
      type: Object as PropType<CalendarController>,
      required: true,
    },
  },
  setup(props) {
    const t = (
      key: Parameters<typeof translate>[1],
      params?: Parameters<typeof translate>[2],
    ): string => translate(props.locale, key, params);

    /** Meta/Ctrl 修饰键用于请求在新的分栏中打开笔记。 */
    const openDay = (event: MouseEvent | KeyboardEvent): void => {
      void props.controller.openDay(
        props.day.date,
        event.metaKey || event.ctrlKey,
      );
    };

    const renderNote = (file: TFile, open: (event: MouseEvent | KeyboardEvent) => void) =>
      h("li", { key: file.path }, [
        h(
          "div",
          {
            class: "calendar-vue__note-item",
            role: "button",
            tabindex: 0,
            title: t("calendar.openFile", { name: file.path }),
            onClick: (event: MouseEvent) => open(event),
            onKeydown: (event: KeyboardEvent) =>
              activateOnKeyboard(event, () => open(event)),
            onContextmenu: (event: MouseEvent) => {
              event.preventDefault();
              props.controller.showFileMenu(file, event);
            },
          },
          [
            h("span", { class: "calendar-vue__note-name" }, file.basename),
            h("span", { class: "calendar-vue__note-path" }, file.path),
          ],
        ),
      ]);

    return () => {
      const canCreate = !props.file;
      const dateLabel = props.day.date.format(DATE_FORMAT);
      return h("section", { class: "calendar-vue__day-details" }, [
        h(
          "div",
          {
            class: ["calendar-vue__create-note", canCreate ? "" : "is-disabled"],
            role: "button",
            tabindex: canCreate ? 0 : -1,
            "aria-disabled": canCreate ? "false" : "true",
            title: canCreate
              ? t("details.createDailyTitle", { date: dateLabel })
              : t("details.dailyCreated"),
            onClick: canCreate ? (event: MouseEvent) => openDay(event) : undefined,
            onKeydown: canCreate
              ? (event: KeyboardEvent) =>
                activateOnKeyboard(event, () => openDay(event))
              : undefined,
          },
          t("details.createDaily"),
        ),
        h(
          "h3",
          { class: "calendar-vue__notes-heading" },
          t("details.dailyHeading", { date: dateLabel }),
        ),
        props.file
          ? h("ul", { class: "calendar-vue__note-list" }, [
            renderNote(props.file, openDay),
          ])
          : h(
            "p",
            { class: "calendar-vue__notes-empty" },
            t("details.noDaily"),
          ),
        h(
          "h3",
          { class: "calendar-vue__notes-heading" },
          t("details.notesHeading", { date: dateLabel }),
        ),
        props.notes.length
          ? h(
            "ul",
            { class: "calendar-vue__note-list" },
            props.notes.map((file) =>
              renderNote(file, (event) => {
                void props.controller.openNote(
                  file,
                  event.metaKey || event.ctrlKey,
                );
              }),
            ),
          )
          : h(
            "p",
            { class: "calendar-vue__notes-empty" },
            t("details.noNotes"),
          ),
      ]);
    };
  },
});
