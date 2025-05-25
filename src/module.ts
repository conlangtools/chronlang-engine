import type { ast } from "@conlangtools/chronlang-parser";
import {
  filterByTag,
  type Language,
  type Milestone,
  sortByTag,
} from "./diachronics.ts";
import type { Class, Feature, Phoneme, Series, Trait } from "./phonemics.ts";
import type { Word } from "./word.ts";
import type { SoundChange } from "./sound-change.ts";

/**
 * A type representing a particular branch of
 * a language family at a given point in time.
 */
export type Snapshot = SnapshotContext & {
  ok: boolean;
  words: Word[];
  soundChanges: SoundChange[];
};

export type SnapshotContext = {
  language: Language;
  time: number;
  errors: { message: string; span: ast.Span }[];
  warnings: { message: string; span: ast.Span }[];
};

type Member = Language | Trait | Class | Series | Word;

/**
 * A class representing a compiled Chronlang module.
 * 
 * Stores information about phonemes, words, languages,
 * sound changes, etc. in a given module. Can be used
 * to generate snapshots of a language family.
 */
export class Module {
  constructor(
    public readonly languages: Map<string, Language> = new Map(),
    public readonly milestones: Milestone[] = [],
    public readonly traits: Map<string, Trait> = new Map(),
    public readonly classes: Map<string, Class> = new Map(),
    public readonly series: Map<string, Series> = new Map(),
    public readonly words: Map<string, Word> = new Map(),
    public readonly soundChanges: SoundChange[] = [],
    public readonly warnings: { message: string; span: ast.Span }[] = [],
    public readonly errors: { message: string; span: ast.Span }[] = [],
  ) {}

  public getEntities(): Map<string, Member> {
    return new Map([
      ...this.languages,
      ...this.traits,
      ...this.classes,
      ...this.series,
      ...this.words,
    ] as (readonly [string, Member])[]);
  }

  public hasEntity(name: string): boolean {
    return this.getEntities().has(name);
  }

  public hasMilestone(milestone: Pick<Milestone, "starts" | "ends" | "language">): boolean {
    const existing = this.milestones.find(m =>
      m.starts === milestone.starts &&
      m.ends === milestone.ends &&
      m.language === milestone.language
    );
    return existing !== undefined
  }

  private import(entity: Member): void {
    switch (entity.kind) {
      case "language":
        this.languages.set(entity.id, entity);
        entity.milestones.forEach(m => {
          if (!this.hasMilestone(m)) this.milestones.push(m);
        })
        break;
      case "trait":
        this.traits.set(entity.name, entity);
        break;
      case "class":
        this.classes.set(entity.name, entity);
        entity.encodes.map((trait) => this.traits.set(trait.name, trait));
        break;
      case "series":
        this.series.set(entity.name, entity);
        break;
      case "word":
        this.words.set(entity.gloss, entity);
        break;
    }
  }

  public importFrom(module: Module, name: string): void {
    this.import(module.getEntities().get(name)!);
  }

  public importAllFrom(module: Module): void {
    [...module.getEntities().values()]
      .map((member) => this.import(member));
  }

  public getFeatures(): Map<string, Feature> {
    return new Map(
      [...this.traits.values()]
        .flatMap((trait) => trait.features)
        .flatMap((feat) => feat.labels.map(([label, _]) => [label, feat])),
    );
  }

  public getPhonemes(): Map<string, Phoneme> {
    return new Map(
      [...this.classes.values()]
        .flatMap((clazz) => clazz.phonemes)
        .map((ph) => [ph.glyph, ph]),
    );
  }

  public listPhonemes(): Phoneme[] {
    return [...this.classes.values()]
      .flatMap((clazz) => clazz.phonemes)
      .toSorted((a, b) => {
        if (a.glyph.length < b.glyph.length) return 1;
        if (b.glyph.length < a.glyph.length) return -1;
        if (a.index < b.index) return -1;
        if (b.index < a.index) return 1;
        return 0;
      });
  }

  public getSoundEntity(name: string): Class | Series | Phoneme | undefined {
    return this.classes.get(name) ??
      this.series.get(name) ??
      this.getPhonemes().get(name);
  }

  public snapshot(language: Language, time: number): Snapshot {
    const soundChanges = [...this.soundChanges.values()]
      .filter(sc => sc.tag.start <= time)
      .toSorted(sortByTag);

    console.log(soundChanges.length)

    const ctx: SnapshotContext = {
      language,
      time,
      errors: [],
      warnings: [],
    };

    const words = filterByTag([...this.words.values()], language, time)
      .map((word) => soundChanges.reduce((w, sc) => w.apply(sc, ctx), word));

    return {
      ...ctx,
      ok: ctx.errors.length === 0,
      words,
      soundChanges,
    };
  }
}
