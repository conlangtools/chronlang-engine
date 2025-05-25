import type { ast } from "@conlangtools/chronlang-parser";
import type { Tag } from "./diachronics.ts";
import type { Category, Modifier, Phoneme } from "./phonemics.ts";
import type { Word } from "./word.ts";
import type { SnapshotContext } from "./module.ts";

export type Source =
  | { kind: "pattern" } & Pattern
  | { kind: "empty" };

export type Target =
  | { kind: "modification"; mods: readonly Modifier[] }
  | { kind: "phonemes"; phonemes: readonly Phoneme[] }
  | { kind: "empty" };

export type Pattern = {
  segments: Segment[];
};

export type Segment =
  | Phoneme
  | { kind: "category" } & Category;

export type Environment = {
  before: EnvPattern;
  after: EnvPattern;
  anchorStart: boolean;
  anchorEnd: boolean;
};

export type EnvPattern = readonly EnvElement[];

export type EnvElement =
  | Phoneme
  | { kind: "category" } & Category;

export type Range = {
  start: number;
  end: number;
  phonemes: Phoneme[];
};

function categoryIncludes(cat: Category, ph: Phoneme): boolean {
  if (cat.baseClass !== null) {
    const bc = cat.baseClass;
    if (bc.kind === "class" && !bc.phonemes.includes(ph)) return false;
    if (bc.kind === "series") {
      if (bc.seriesKind === "list" && !bc.phonemes.includes(ph)) return false;
      if (bc.seriesKind === "category" && !categoryIncludes(bc, ph)) {
        return false;
      }
    }
  }

  for (const mod of cat.modifiers) {
    const featMatches = ph.features.get(mod.feature.trait) === mod.feature;
    if (!featMatches && mod.sign === "positive") return false;
    if (featMatches && mod.sign === "negative") return false;
  }

  return true;
}

/**
 * A class representing a regular sound change.
 * 
 * Can be used to mutate {@link Word}s
 */
export class SoundChange {
  public readonly kind = "sound-change";
  constructor(
    public readonly source: Source,
    public readonly target: Target,
    public readonly environment: Environment | null,
    public readonly description: string | null,
    public readonly tag: Tag,
    public readonly definitionSite: ast.Span,
  ) {}

  private findSourceIn(phonemes: Phoneme[]): Range[] {
    if (this.source.kind === "empty") {
      return Array.from(
        { length: phonemes.length + 1 },
        (_, i) => ({ start: i, end: i, phonemes: [] }),
      );
    }

    const ranges: Range[] = [];
    for (
      let i = 0;
      i < phonemes.length - this.source.segments.length + 1;
      i++
    ) {
      let matchFailed = false;
      for (let j = 0; j < this.source.segments.length; j++) {
        if (i + j >= phonemes.length) {
          matchFailed = true;
          break;
        }
        const segment = this.source.segments[j];
        const phoneme = phonemes[i + j];
        if (segment.kind === "phoneme" && phoneme === segment) continue;
        if (segment.kind === "category" && categoryIncludes(segment, phoneme)) {
          continue;
        }
        matchFailed = true;
      }
      if (!matchFailed) {
        const end = i + this.source.segments.length;
        ranges.push({
          start: i,
          end: end,
          phonemes: phonemes.slice(i, end),
        });
      }
    }

    return ranges;
  }

  private testEnvironment(phonemes: Phoneme[], range: Range): boolean {
    if (this.environment === null) return true;
    if (
      this.environment.anchorStart &&
      range.start - this.environment.before.length !== 0
    ) return false;
    if (
      this.environment.anchorEnd &&
      range.end + this.environment.after.length !== phonemes.length
    ) return false;

    for (let i = 0; i < this.environment.before.length; i++) {
      if (range.start - i - 1 < 0) return false;
      const seg = this.environment.before.at(-i - 1)!;
      const ph = phonemes[range.start - i - 1];
      if (seg.kind === "phoneme" && seg === ph) continue;
      if (seg.kind === "category" && categoryIncludes(seg, ph)) continue;
      return false;
    }

    for (let i = 0; i < this.environment.after.length; i++) {
      if (range.end + i >= phonemes.length) return false;
      const seg = this.environment.after[i];
      const ph = phonemes[range.end + i];
      if (seg.kind === "phoneme" && seg === ph) continue;
      if (seg.kind === "category" && categoryIncludes(seg, ph)) continue;
      return false;
    }

    return true;
  }

  private findMatchesIn(phonemes: Phoneme[]): Range[] {
    return this.findSourceIn(phonemes)
      .filter((range) => this.testEnvironment(phonemes, range));
  }

  public appliesTo(word: Word): boolean {
    return this.tagsOverlap(this.tag, word.tag)
      && this.findMatchesIn(word.phonemes).length > 0;
  }

  private tagsOverlap(a: Tag, b: Tag) {
    return a.start < b.end && b.start < a.end
  }

  private resolveTarget(
    source: Phoneme[],
    ctx: SnapshotContext,
  ): readonly Phoneme[] {
    if (this.target.kind === "empty") return [];
    if (this.target.kind === "modification") {
      const mods = this.target.mods;
      return source.map((ph) => {
        const newFeats = new Map(ph.features);
        for (const mod of mods) {
          const trait = mod.feature.trait;
          if (!ph.features.has(trait)) continue;
          const newFeat = mod.sign === "positive"
            ? mod.feature
            : trait.default === mod.feature
            ? trait.features.filter((feat) => feat !== mod.feature).at(0)!
            : trait.default;

          newFeats.set(mod.feature.trait, newFeat);
        }

        const featEntries = [...newFeats.entries()];

        const candidates = ph.class.phonemes.filter((p) =>
          featEntries.every(([trait, feat]) => p.features.get(trait) === feat)
        );

        if (candidates.length === 0) {
          ctx.warnings.push({
            message:
              `This rule generates phonemes that cannot be described by classes in this project`,
            span: this.definitionSite,
          });
          return ph;
        }

        return candidates[0];
      });
    }
    return this.target.phonemes;
  }

  public applyTo(word: Word, ctx: SnapshotContext): Phoneme[] {
    const ranges = this.findMatchesIn(word.phonemes);
    const phonemes = [...word.phonemes];
    let offset = 0;
    for (const range of ranges) {
      const len = range.end - range.start;
      const source = phonemes.slice(range.start, range.end);
      const target = this.resolveTarget(source, ctx);
      phonemes.splice(range.start + offset, len, ...target);
      offset += target.length - source.length;
    }
    return phonemes;
  }
}
