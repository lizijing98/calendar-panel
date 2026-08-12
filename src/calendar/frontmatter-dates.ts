const DATE_PATTERN = /(?:^|[^\d])(\d{4}-\d{2}-\d{2})(?!\d)/g;

/**
 * 递归检查 Frontmatter 值，返回其中属于当前可见网格的日期 ID。
 * 支持字符串、数组、嵌套对象和 YAML 日期值；忽略 Obsidian 注入的位置信息。
 */
export function getVisibleFrontmatterDates(
  frontmatter: unknown,
  visibleDateIds: ReadonlySet<string>,
): string[] {
  const matches = new Set<string>();

  const visit = (value: unknown, isRoot = false): void => {
    if (typeof value === "string") {
      for (const match of value.matchAll(DATE_PATTERN)) {
        const dateId = match[1];
        if (!dateId) {
          continue;
        }
        if (visibleDateIds.has(dateId)) {
          matches.add(dateId);
        }
      }
      return;
    }

    if (value instanceof Date) {
      visit(value.toISOString());
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item));
      return;
    }

    if (value && typeof value === "object") {
      for (const [key, nestedValue] of Object.entries(value)) {
        if (!isRoot || key !== "position") {
          visit(nestedValue);
        }
      }
    }
  };

  visit(frontmatter, true);
  return Array.from(matches);
}

/** 将候选文件按 Frontmatter 中命中的可见日期分组，并排除独立展示的日记。 */
export function groupNotesByVisibleFrontmatterDates<T extends { path: string }>(
  files: readonly T[],
  getFrontmatter: (file: T) => unknown,
  visibleDateIds: ReadonlySet<string>,
  excludedPaths: ReadonlySet<string>,
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  for (const file of files) {
    if (excludedPaths.has(file.path)) {
      continue;
    }
    for (const dateId of getVisibleFrontmatterDates(
      getFrontmatter(file),
      visibleDateIds,
    )) {
      (grouped[dateId] ??= []).push(file);
    }
  }

  for (const groupedFiles of Object.values(grouped)) {
    groupedFiles.sort((left, right) => left.path.localeCompare(right.path));
  }
  return grouped;
}
