import { describe, expect, it } from "vitest";

import {
  getVisibleFrontmatterDates,
  groupNotesByVisibleFrontmatterDates,
} from "../src/calendar/frontmatter-dates";

describe("Frontmatter 日期笔记", () => {
  const visibleDateIds = new Set([
    "2026-07-27",
    "2026-08-12",
    "2026-08-13",
    "2026-09-06",
  ]);

  it("从字符串、数组和嵌套对象中提取当前网格可见日期", () => {
    const frontmatter = {
      date: "2026-08-12",
      related: ["2026-08-13", { reviewedAt: "完成于 2026-09-06 10:00" }],
      nested: { start: "2026-07-27" },
    };

    expect(getVisibleFrontmatterDates(frontmatter, visibleDateIds)).toEqual([
      "2026-08-12",
      "2026-08-13",
      "2026-09-06",
      "2026-07-27",
    ]);
  });

  it("忽略网格外日期、重复日期和 Obsidian 位置信息", () => {
    const frontmatter = {
      dates: ["2026-08-12", "2026-08-12", "2026-08-120", "2026-10-01"],
      position: { source: "2026-08-13" },
    };

    expect(getVisibleFrontmatterDates(frontmatter, visibleDateIds)).toEqual([
      "2026-08-12",
    ]);
  });

  it("没有 Frontmatter 时返回空数组", () => {
    expect(getVisibleFrontmatterDates(undefined, visibleDateIds)).toEqual([]);
  });

  it("支持 YAML 日期对象和同一字符串中的多个日期", () => {
    const frontmatter = {
      published: new Date("2026-08-12T08:00:00.000Z"),
      range: "2026-08-13 至 2026-09-06",
    };

    expect(getVisibleFrontmatterDates(frontmatter, visibleDateIds)).toEqual([
      "2026-08-12",
      "2026-08-13",
      "2026-09-06",
    ]);
  });

  it("只匹配完整日期数字边界", () => {
    const frontmatter = {
      valid: "日期：(2026-08-12)",
      invalid: ["12026-08-13", "2026-09-060"],
    };

    expect(getVisibleFrontmatterDates(frontmatter, visibleDateIds)).toEqual([
      "2026-08-12",
    ]);
  });

  it("仅忽略 Obsidian 根级 position，保留普通嵌套 position 字段", () => {
    const frontmatter = {
      position: { source: "2026-08-12" },
      schedule: { position: "2026-08-13" },
    };

    expect(getVisibleFrontmatterDates(frontmatter, visibleDateIds)).toEqual([
      "2026-08-13",
    ]);
  });

  it("可见日期集合为空时不返回任何日期", () => {
    expect(
      getVisibleFrontmatterDates({ date: "2026-08-12" }, new Set()),
    ).toEqual([]);
  });
});

describe("Frontmatter 日期笔记分组", () => {
  const files = [
    { path: "Notes/Zeta.md" },
    { path: "Daily/2026-08-12.md" },
    { path: "Notes/Alpha.md" },
    { path: "Notes/Outside.md" },
  ];
  const frontmatterByPath: Record<string, unknown> = {
    "Notes/Zeta.md": { dates: ["2026-08-12", "2026-08-13", "2026-08-12"] },
    "Daily/2026-08-12.md": { date: "2026-08-12" },
    "Notes/Alpha.md": { date: "2026-08-12" },
    "Notes/Outside.md": { date: "2026-10-01" },
  };

  it("按可见日期归组、排除日记并按路径排序", () => {
    const grouped = groupNotesByVisibleFrontmatterDates(
      files,
      (file) => frontmatterByPath[file.path],
      new Set(["2026-08-12", "2026-08-13"]),
      new Set(["Daily/2026-08-12.md"]),
    );

    expect(grouped).toEqual({
      "2026-08-12": [
        { path: "Notes/Alpha.md" },
        { path: "Notes/Zeta.md" },
      ],
      "2026-08-13": [{ path: "Notes/Zeta.md" }],
    });
  });

  it("没有日期命中时返回空分组", () => {
    expect(
      groupNotesByVisibleFrontmatterDates(
        files,
        (file) => frontmatterByPath[file.path],
        new Set(["2026-07-27"]),
        new Set(),
      ),
    ).toEqual({});
  });
});
