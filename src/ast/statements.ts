import type { Category, SoundChange } from "./sound-change.ts";
import type { Span, Spanned } from "./span.ts";

export type Stmt =
  | { kind: "import" } & Import
  | { kind: "language" } & Language
  | { kind: "milestone" } & Milestone
  | { kind: "trait" } & Trait
  | { kind: "class" } & Class
  | { kind: "series" } & Series
  | { kind: "word" } & Word
  | { kind: "sound-change" } & SoundChange;

// IMPORT

export type BaseImport = {
  path: Spanned<string>;
  names: readonly Spanned<string>[];
};

export type LocalImport = BaseImport & {
  scoped: false;
  absolute: boolean;
};

export type ScopedImport = BaseImport & {
  scoped: true;
  scope: Spanned<string>;
};

export type Import = LocalImport | ScopedImport;

// LANGUAGE

export type Language = {
  id: Spanned<string>;
  parent: Spanned<string> | null;
  name: Spanned<string> | null;
};

// MILESTONE

export type Milestone = {
  time: Time | null;
  language: Spanned<string> | null;
};

export type Time =
  & { span: Span }
  & (
    | { kind: "instant"; time: number }
    | { kind: "open-range"; start: number }
    | { kind: "closed-range"; start: number; end: number }
  );

// TRAIT

export type Trait = {
  label: Spanned<string>;
  members: readonly TraitMember[];
};

export type TraitMember = {
  labels: readonly Spanned<string>[];
  notation: Spanned<string> | null;
  default: boolean;
  span: Span;
};

// CLASS

export type Class = {
  label: Spanned<string>;
  encodes: readonly Spanned<string>[];
  annotates: readonly Spanned<string>[];
  phonemes: readonly PhonemeDef[];
};

export type PhonemeDef = {
  label: Spanned<string>;
  traits: readonly Spanned<string>[];
  span: Span;
};

// SERIES

export type Series =
  & { label: Spanned<string> }
  & (
    | { seriesKind: "category" } & Category
    | { seriesKind: "list"; phonemes: readonly Spanned<string>[] }
  );

// WORD

export type Word = {
  gloss: Spanned<string>;
  pronunciation: Spanned<string>;
  definitions: readonly Definition[];
};

export type Definition = {
  partOfSpeech: Spanned<string> | null;
  text: Spanned<string>;
};
