import type { ast } from "@conlangtools/chronlang-parser";

/**
 * Represents a member of a language family
 */
export type Language = {
  kind: "language";
  name: string;
  id: string;
  parent: Language | null;
  milestones: Milestone[];
  definitionSite: ast.Span;
};

export type Milestone = {
  kind: "milestone";
  starts: number;
  ends: number;
  language: Language;
};

/**
 * A type used to specify a point in time in
 * a specific language's evolution
 */
export type Tag = {
  start: number;
  end: number;
  language: Language;
  index: number;
};

function isChildLanguage(child: Language, maybeParent: Language) {
  if (child === maybeParent) return true;
  if (child.parent === null) return false;
  if (child.parent === maybeParent) return true;
  return isChildLanguage(child.parent, maybeParent);
}

export function filterByTag<T extends { tag: Tag }>(
  items: T[],
  language: Language,
  time: number,
): T[] {
  return items
    .filter((word) => isChildLanguage(language, word.tag.language))
    .filter((word) => time >= word.tag.start && word.tag.end >= time);
}

export function sortByTag<T extends { tag: Tag }>(a: T, b: T): number {
  if (a.tag.start < b.tag.start) return -1;
  if (b.tag.start < a.tag.start) return 1;
  if (a.tag.index < b.tag.index) return -1;
  return 0;
}
