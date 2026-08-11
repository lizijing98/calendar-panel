import { TFile, type CachedMetadata, type Vault } from "obsidian";
import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  TFile: class {},
  parseFrontMatterTags: (frontmatter: { tags?: string[] }) =>
    frontmatter.tags ?? [],
}));

import {
  getFrontmatterTags,
  hasIncompleteTasks,
  readNoteMetadata,
} from "../src/calendar/note-metadata";

describe("笔记元数据", () => {
  it("仅在笔记包含未完成的 Markdown 任务时返回 true", () => {
    expect(hasIncompleteTasks("- [ ] 未完成\n- [x] 已完成")).toBe(true);
    expect(hasIncompleteTasks("  * [ ] 缩进的未完成任务")).toBe(true);
    expect(hasIncompleteTasks("- [x] 已完成")).toBe(false);
    expect(hasIncompleteTasks("正文中的 [ ] 不是任务列表")).toBe(false);
  });

  it("从 frontmatter 标签中分离普通标签和首个表情标签", () => {
    const cache = {
      frontmatter: {
        tags: ["#工作", "#✅提醒", "项目", "#⭐完成"],
      },
    } as unknown as CachedMetadata;

    expect(getFrontmatterTags(cache)).toEqual({
      tags: ["工作", "项目"],
      emojiTag: "✅提醒",
    });
    expect(getFrontmatterTags(null)).toEqual({ tags: [], emojiTag: null });
  });

  it("读取笔记内容并生成任务、标签和文件缓存键", async () => {
    const file = new TFile();
    file.stat = { ctime: 1_723_456_000, mtime: 1_723_456_789, size: 128 };
    const cachedRead = vi.fn().mockResolvedValue("- [ ] 跟进日程");
    const vault = { cachedRead } as unknown as Vault;
    const cache = {
      frontmatter: { tags: ["#日程", "#✅"] },
    } as unknown as CachedMetadata;

    await expect(readNoteMetadata(vault, file, cache)).resolves.toEqual({
      hasIncompleteTasks: true,
      tags: ["日程"],
      emojiTag: "✅",
      cacheKey: "1723456789:128",
    });
    expect(cachedRead).toHaveBeenCalledOnce();
    expect(cachedRead).toHaveBeenCalledWith(file);
  });
});
