import type { CachedMetadata, TFile, Vault } from "obsidian";
import { parseFrontMatterTags } from "obsidian";

import type { NoteMetadata } from "../types";

const EMOJI_PATTERN = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u2600-\u26ff]|\u2b50|\u2b55)/u;

/** 判断正文中是否存在 Markdown 未完成任务（- [ ]、* [ ] 或 + [ ]）。 */
export function hasIncompleteTasks(text: string): boolean {
  return /^\s*[-*+]\s+\[\s\]/im.test(text);
}

/**
 * 从 Obsidian 元数据缓存中读取 frontmatter 标签，并将首个 emoji 标签
 * 单独用于日历装饰，其余标签用于 data-tags 样式选择器。
 */
export function getFrontmatterTags(cache: CachedMetadata | null): {
  tags: string[];
  emojiTag: string | null;
} {
  const parsed = cache?.frontmatter
    ? parseFrontMatterTags(cache.frontmatter) ?? []
    : [];
  const normalized = parsed.map((tag) => tag.replace(/^#/, ""));
  const emojiTag = normalized.find((tag) => EMOJI_PATTERN.test(tag)) ?? null;
  return {
    tags: normalized.filter((tag) => !EMOJI_PATTERN.test(tag)),
    emojiTag,
  };
}

/** 合并正文任务状态与缓存标签，生成日历单元格使用的轻量元数据。 */
export async function readNoteMetadata(
  vault: Vault,
  file: TFile,
  cache: CachedMetadata | null,
): Promise<NoteMetadata> {
  const text = await vault.cachedRead(file);
  const { tags, emojiTag } = getFrontmatterTags(cache);
  return {
    hasIncompleteTasks: hasIncompleteTasks(text),
    tags,
    emojiTag,
    cacheKey: `${file.stat.mtime}:${file.stat.size}`,
  };
}
