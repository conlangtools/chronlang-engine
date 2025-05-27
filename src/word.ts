import type { Span } from "./ast/mod.ts";
import type { Phoneme } from "./phonemics.ts";
import type { SoundChange } from "./sound-change.ts";
import type { Tag } from "./diachronics.ts";
import type { SnapshotContext } from "./module.ts";

/**
 * A class representing a member of a language's dictionary,
 * and its pronunciation at a given {@link Tag}
 *
 * Can be rendered as a phonemic transcription, or mutated
 * by sound changes.
 */
export class Word {
  public readonly kind = "word";
  constructor(
    public readonly gloss: string,
    public readonly phonemes: Phoneme[],
    public readonly definitions: readonly Definition[],
    public readonly tag: Tag,
    public readonly definitionSite: Span,
    public readonly etymology: readonly (readonly [Word, SoundChange])[] = [],
  ) {}

  public render(): string {
    return this.phonemes.map((ph) => ph.glyph).join("");
  }

  public apply(sc: SoundChange, ctx: SnapshotContext): Word {
    if (!sc.appliesTo(this)) return this;
    return new Word(
      this.gloss,
      sc.applyTo(this, ctx),
      this.definitions,
      this.tag,
      this.definitionSite,
      [...this.etymology, [this, sc]],
    );
  }
}

export type Definition = {
  partOfSpeech: string | null;
  text: string;
};
