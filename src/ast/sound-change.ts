import { Span, Spanned } from "./span.ts";

export type SoundChange = {
  source: Source;
  target: Target;
  environment: Environment | null;
  description: Spanned<string> | null;
};

export type Source =
  & { span: Span }
  & (
    | { kind: "pattern" } & Pattern
    | { kind: "empty" }
  );

export type Target =
  & { span: Span }
  & (
    | { kind: "modification"; mods: readonly Feature[] }
    | { kind: "phonemes"; glyphs: string }
    | { kind: "empty" }
  );

export type Pattern = {
  segments: readonly Segment[];
};

export type Segment =
  | { kind: "category" } & Category
  | { kind: "phonemes"; glyphs: string; span: Span };

export type Category = {
  baseClass: Spanned<string> | null;
  features: readonly Feature[];
  span: Span;
};

export type Feature = {
  sign: "positive" | "negative";
  name: string;
  span: Span;
};

export type Environment = {
  before: EnvPattern;
  after: EnvPattern;
  anchorStart: boolean;
  anchorEnd: boolean;
  span: Span;
};

export type EnvPattern = readonly EnvElement[];

export type EnvElement =
  & { span: Span }
  & (
    | { kind: "pattern" } & Pattern
    | { kind: "syllable-boundary" }
  );
