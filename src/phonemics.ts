import type { Span } from "./ast/mod.ts";

export type Trait = {
  kind: "trait";
  name: string;
  default: Feature;
  features: Feature[];
  definitionSite: Span;
};

export type Feature = {
  labels: readonly (readonly [string, Span])[];
  trait: Trait;
};

export type Class = {
  kind: "class";
  name: string;
  encodes: Trait[];
  annotates: Trait[];
  phonemes: Phoneme[];
  definitionSite: Span;
};

export type Phoneme = {
  kind: "phoneme";
  glyph: string;
  features: Map<Trait, Feature>;
  class: Class;
  index: number;
  definitionSite: Span;
};

export type Series =
  & { kind: "series"; name: string; definitionSite: Span }
  & (
    | { seriesKind: "list"; phonemes: Phoneme[] }
    | { seriesKind: "category" } & Category
  );

export type Category = {
  baseClass: Class | Series | null;
  modifiers: Modifier[];
};

export type Modifier = {
  feature: Feature;
  name: string;
  sign: "positive" | "negative";
};

export type PhonemeMatch = {
  offset: number;
  length: number;
  phoneme: Phoneme;
};

type MatchResult =
  | { ok: true; matches: PhonemeMatch[] }
  | {
    ok: false;
    matches: PhonemeMatch[];
    offset: number;
    rest: string;
    message: string;
  };

export function matchPhonemes(
  transcription: string,
  phonemes: Phoneme[],
): MatchResult {
  const matches: PhonemeMatch[] = [];

  let offset = 0;
  let rest = transcription;
  while (offset < transcription.length) {
    let matchFound = false;
    for (const ph of phonemes) {
      if (rest.startsWith(ph.glyph)) {
        matches.push({
          offset,
          length: ph.glyph.length,
          phoneme: ph,
        });
        offset += ph.glyph.length;
        matchFound = true;
        break;
      }
    }
    if (!matchFound) {
      return {
        ok: false,
        matches,
        offset,
        rest,
        message: `Failed to match phoneme at "${rest[0]}"`,
      };
    }

    rest = transcription.substring(offset);
  }

  if (rest.length > 0) {
    return {
      ok: false,
      matches,
      offset,
      rest,
      message: `Unconsumed input at "${rest[0]}"`,
    };
  }

  return {
    ok: true,
    matches,
  };
}
