import { type ast, parse } from "@conlangtools/chronlang-parser";
import { assert } from "jsr:@std/assert";
import {
  type Category,
  type Class,
  type Feature,
  matchPhonemes,
  type Modifier,
  type Phoneme,
  type Series,
  type Trait,
} from "./phonemics.ts";
import type { Language, Tag } from "./diachronics.ts";
import { Module } from "./module.ts";
import { Word } from "./word.ts";
import {
  type Environment,
  SoundChange,
  type Source,
  type Target,
} from "./sound-change.ts";

class Context {
  private tagIndex = 0;
  private tagLanguage: Language | null = null;
  private tagStart: number | null = null;
  private tagEnd: number | null = null;

  private phonemeIndex = 0;

  constructor() {}

  public setTime(start: number) {
    this.tagStart = start;
    this.tagEnd = start;
  }

  public setTimeRange(start: number, end: number) {
    this.tagStart = start;
    this.tagEnd = end;
  }

  public setLanguage(lang: Language) {
    this.tagLanguage = lang;
  }

  public hasTag(): boolean {
    return this.tagStart !== null &&
      this.tagEnd !== null &&
      this.tagLanguage !== null;
  }

  public getTag(): Tag {
    assert(
      this.tagStart !== null,
      "`getTag()` called before start time specified. Use `hasTag()` to validate first.",
    );
    assert(
      this.tagEnd !== null,
      "`getTag()` called before end time specified. Use `hasTag()` to validate first.",
    );
    assert(
      this.tagLanguage !== null,
      "`getTag()` called before language specified. Use `hasTag()` to validate first.",
    );

    return {
      start: this.tagStart,
      end: this.tagEnd,
      language: this.tagLanguage,
      index: this.tagIndex++,
    };
  }

  public getPhonemeIndex(): number {
    return this.phonemeIndex++;
  }
}

type ResolutionResult =
  | { ok: true; module: Module }
  | { ok: false; error: string };

interface ModuleResolver {
  resolveScoped(scope: string, path: string): ResolutionResult;
  resolveLocal(path: string, absolute: boolean): ResolutionResult;
}

export class MockResolver implements ModuleResolver {
  constructor(
    private readonly sources: Map<string, string>,
  ) {}

  private resolve(sourceName: string): ResolutionResult {
    const source = this.sources.get(sourceName);

    if (source === undefined) {
      return {
        ok: false,
        error: `No source is defined with name '${sourceName}'`,
      };
    }

    return {
      ok: true,
      module: compileModule(source, sourceName, this),
    };
  }

  public resolveScoped(scope: string, path: string): ResolutionResult {
    return this.resolve(`@${scope}${path}`);
  }

  public resolveLocal(path: string, absolute: boolean): ResolutionResult {
    return this.resolve(absolute ? "/" : "" + path);
  }
}

export function compileModule(
  source: string,
  sourceName: string,
  moduleResolver: ModuleResolver,
): Module {
  const module = new Module();
  const ctx = new Context();

  const parseResult = parse(source, sourceName);
  if (!parseResult.ok) {
    const { error } = parseResult;
    module.errors.push({ message: error.message, span: error.location });
    return module;
  }

  for (const stmt of parseResult.statements) {
    const shouldContinue = compileStatement(module, ctx, moduleResolver, stmt);
    if (!shouldContinue) break;
  }

  return module;
}

export function compileStatement(
  module: Module,
  ctx: Context,
  moduleResolver: ModuleResolver,
  stmt: ast.Stmt,
): boolean {
  switch (stmt.kind) {
    case "import":
      return compileImport(module, moduleResolver, stmt);
    case "language":
      return compileLanguage(module, ctx, stmt);
    case "milestone":
      return compileMilestone(module, ctx, stmt);
    case "trait":
      return compileTrait(module, stmt);
    case "class":
      return compileClass(module, ctx, stmt);
    case "series":
      return compileSeries(module, stmt);
    case "word":
      return compileWord(module, ctx, stmt);
    case "sound-change":
      return compileSoundChange(module, ctx, stmt);
  }
}

function mergeSpans(first: ast.Span, last: ast.Span): ast.Span {
  return {
    source: first.source,
    start: first.start,
    end: last.end,
  };
}

function shiftSpan(span: ast.Span, offset: number, length?: number): ast.Span {
  return {
    source: span.source,
    start: {
      offset: span.start.offset + offset,
      column: span.start.column + offset,
      line: span.start.line,
    },
    end: {
      offset: length !== undefined
        ? (span.start.offset + offset + length)
        : (span.end.offset + offset),
      column: length !== undefined
        ? (span.start.column + offset + length)
        : (span.end.column + offset),
      line: span.end.line,
    },
  };
}

export function stringifySpan({ source, start }: ast.Span): string {
  return `${source} ${start.line}:${start.column}`;
}

export function compileImport(
  module: Module,
  moduleResolver: ModuleResolver,
  stmt: ast.Import,
): boolean {
  const moduleName = stmt.scoped
    ? `@${stmt.scope[0]}/${stmt.path[0]}`
    : (stmt.absolute ? "/" : "") + stmt.path[0];

  const res = stmt.scoped
    ? moduleResolver.resolveScoped(stmt.scope[0], stmt.path[0])
    : moduleResolver.resolveLocal(stmt.path[0], stmt.absolute);

  if (!res.ok) {
    module.errors.push({
      message: res.error,
      span: stmt.path[1],
    });
    return true;
  }

  module.errors.push(...res.module.errors.map((err) => ({
    message: err.message,
    sourceSpan: err.span,
    span: stmt.path[1],
  })));

  for (const [name, nameSpan] of stmt.names) {
    if (name === "*") {
      if (stmt.names.length > 1) {
        module.errors.push({
          message: "Wildcard imports cannot be used alongside named imports.",
          span: nameSpan,
        });
        continue;
      }
      module.importAllFrom(res.module);
      continue;
    }

    if (!res.module.hasEntity(name)) {
      module.errors.push({
        message: `The module ${moduleName} has no member "${name}".`,
        span: nameSpan,
      });
      continue;
    }

    module.importFrom(res.module, name);
  }

  return true;
}

export function compileLanguage(
  module: Module,
  ctx: Context,
  stmt: ast.Language,
): boolean {
  let parent: Language | null = null;

  if (stmt.parent !== null) {
    const [parentId, parentSpan] = stmt.parent;
    parent = module.languages.get(parentId) ?? null;
    if (parent === null) {
      module.errors.push({
        message: `The parent language "${parentId}" does not exist`,
        span: parentSpan,
      });
    }
  }

  const [id, idSpan] = stmt.id;
  const conflict = module.languages.get(id);
  if (conflict !== undefined) {
    const conflictLocation = stringifySpan(conflict.definitionSite);
    module.errors.push({
      message:
        `A language with ID "${id} is already defined at ${conflictLocation}"`,
      span: idSpan,
    });
    return true;
  }

  const language = {
    kind: "language",
    id,
    name: stmt.name?.[0] ?? id,
    parent,
    definitionSite: idSpan,
  } as const;

  module.languages.set(id, language);

  ctx.setLanguage(language);

  return true;
}

export function compileMilestone(
  module: Module,
  ctx: Context,
  stmt: ast.Milestone,
): boolean {
  if (stmt.time !== null) {
    if (stmt.time.kind === "instant") {
      ctx.setTimeRange(stmt.time.time, Infinity);
    } else if (stmt.time.start < stmt.time.end) {
      ctx.setTimeRange(stmt.time.start, stmt.time.end);
    } else {
      module.errors.push({
        message: "milestone timespan start must preceed the end",
        span: stmt.time.span,
      });
    }
  }

  if (stmt.language !== null) {
    const [id, span] = stmt.language;
    const lang = module.languages.get(id);
    if (lang === undefined) {
      module.errors.push({
        message: `the language "${id}" does not exist`,
        span,
      });
    } else {
      ctx.setLanguage(lang);
    }
  }

  return true;
}

export function compileTrait(
  module: Module,
  stmt: ast.Trait,
): boolean {
  const [name, nameSpan] = stmt.label;
  const conflict = module.traits.get(name);
  if (conflict !== undefined) {
    const conflictLocation = stringifySpan(conflict.definitionSite);
    module.errors.push({
      message:
        `A trait with name "${name} is already defined at ${conflictLocation}"`,
      span: nameSpan,
    });
    return true;
  }

  const trait: Trait = {
    kind: "trait",
    name,
    features: [],
    default: null as unknown as Feature,
    definitionSite: nameSpan,
  };

  let hasDefault = false;

  const existingFeatures = module.getFeatures();
  for (const member of stmt.members) {
    for (const [label, labelSpan] of member.labels) {
      const featureConflict = existingFeatures.get(label);
      if (featureConflict !== undefined) {
        module.errors.push({
          message:
            `A feature with name "${label}" is already defined in trait "${featureConflict.trait.name}"`,
          span: labelSpan,
        });
        continue;
      }
    }

    const feature = { trait, labels: member.labels };
    trait.features.push(feature);

    if (member.default) {
      if (hasDefault) {
        module.errors.push({
          message: `A trait cannot have more than one default member.`,
          span: trait.default.labels[0][1],
        });
      } else {
        trait.default = feature;
        hasDefault = true;
      }
    }
  }

  if (!hasDefault) {
    trait.default = trait.features[0];
  }

  module.traits.set(trait.name, trait);

  return true;
}

export function compileClass(
  module: Module,
  ctx: Context,
  stmt: ast.Class,
): boolean {
  const [name, nameSpan] = stmt.label;
  const conflict = module.getSoundEntity(name);
  if (conflict !== undefined) {
    const conflictLocation = stringifySpan(conflict.definitionSite);
    module.errors.push({
      message:
        `A class, series or phoneme named "${name}" is already defined at ${conflictLocation}`,
      span: nameSpan,
    });
    return true;
  }

  const clazz: Class = {
    kind: "class",
    name,
    encodes: [],
    annotates: [],
    phonemes: [],
    definitionSite: nameSpan,
  };

  for (const [encoded, encodedSpan] of stmt.encodes) {
    const trait = module.traits.get(encoded);
    if (trait === undefined) {
      module.errors.push({
        message: `No trait exists named "${encoded}"`,
        span: encodedSpan,
      });
      return true;
    }
    clazz.encodes.push(trait);
  }

  for (const phonemeDef of stmt.phonemes) {
    const [glyph, phSpan] = phonemeDef.label;
    const phConflict = module.getSoundEntity(glyph);
    if (phConflict !== undefined) {
      const conflictLocation = stringifySpan(phConflict.definitionSite);
      module.errors.push({
        message:
          `A class, series or phoneme named "${glyph}" is already defined at ${conflictLocation}`,
        span: phSpan,
      });
      continue;
    }

    const phoneme: Phoneme = {
      kind: "phoneme",
      glyph,
      features: new Map(),
      class: clazz,
      index: ctx.getPhonemeIndex(),
      definitionSite: phSpan,
    };

    if (phonemeDef.traits.length !== clazz.encodes.length) {
      module.errors.push({
        message:
          `Phonemes in class ${clazz.name} must have ${clazz.encodes.length} features, "${glyph}" has ${phonemeDef.traits.length}`,
        span: mergeSpans(phonemeDef.traits[0][1], phonemeDef.traits.at(-1)![1]),
      });
    }

    for (let i = 0; i < phonemeDef.traits.length; i++) {
      const trait = clazz.encodes[i];
      const [featName, featSpan] = phonemeDef.traits[i];
      const feat = trait.features.find((f) =>
        f.labels.map((l) => l[0]).includes(featName)
      );
      if (feat === undefined) {
        module.errors.push({
          message: `Trait "${trait.name}" has no member "${featName}"`,
          span: featSpan,
        });
        continue;
      }
      phoneme.features.set(trait, feat);
    }

    clazz.phonemes.push(phoneme);
  }

  module.classes.set(clazz.name, clazz);

  return true;
}

export function compileSeries(
  module: Module,
  stmt: ast.Series,
): boolean {
  const [label, labelSpan] = stmt.label;
  const conflict = module.getSoundEntity(label);
  if (conflict !== undefined) {
    const conflictLocation = stringifySpan(conflict.definitionSite);
    module.errors.push({
      message:
        `A class, series or phoneme named "${label}" is already defined at ${conflictLocation}.`,
      span: labelSpan,
    });
    return true;
  }

  if (stmt.seriesKind == "list") {
    const phonemes = [];
    for (const [glyph, glyphSpan] of stmt.phonemes) {
      const phoneme = module.getPhonemes().get(glyph);
      if (phoneme === undefined) {
        module.errors.push({
          message:
            `The glyph ${glyph} does not correspond to a defined phoneme.`,
          span: glyphSpan,
        });
        continue;
      }
      phonemes.push(phoneme);
    }
    module.series.set(label, {
      kind: "series",
      name: label,
      seriesKind: "list",
      phonemes,
      definitionSite: labelSpan,
    });
  } else {
    const res = compileCategory(module, stmt);

    if (!res.ok) {
      module.errors.push({
        message: res.message,
        span: res.span,
      });
      return true;
    }

    module.series.set(label, {
      kind: "series",
      name: label,
      seriesKind: "category",
      definitionSite: labelSpan,
      ...res.category,
    });
  }

  return true;
}

type CategoryData = {
  baseClass: readonly [string, ast.Span] | null;
  features: readonly ast.Feature[];
};

type CategoryCompilationResult =
  | { ok: true; category: Category }
  | { ok: false; message: string; span: ast.Span };

function compileCategory(
  module: Module,
  data: CategoryData,
): CategoryCompilationResult {
  let baseClass: Class | Series | null = null;

  if (data.baseClass !== null) {
    const [bcName, bcSpan] = data.baseClass;
    baseClass = module.classes.get(bcName) ?? module.series.get(bcName) ?? null;
    if (baseClass === null) {
      return {
        ok: false,
        message: `No class or series exists named "${bcName}"`,
        span: bcSpan,
      };
    }
  }

  const modifiers: Modifier[] = [];

  for (const mod of data.features) {
    const feature = module.getFeatures().get(mod.name);
    if (feature === undefined) {
      module.errors.push({
        message: `No feature exists named "${mod.name}"`,
        span: mod.span,
      });
      continue;
    }

    if (baseClass !== null) {
      if (
        baseClass.kind === "class" && !baseClass.encodes.includes(feature.trait)
      ) {
        module.errors.push({
          message:
            `The base class "${baseClass.name}" does not encode the trait "${feature.trait.name}" which includes the feature "${
              feature.labels[0][0]
            }"`,
          span: mod.span,
        });
        continue;
      }
    }

    modifiers.push({
      feature,
      name: mod.name,
      sign: mod.sign,
    });
  }

  return {
    ok: true,
    category: { baseClass, modifiers },
  };
}

export function compileWord(
  module: Module,
  ctx: Context,
  stmt: ast.Word,
): boolean {
  const [gloss, glossSpan] = stmt.gloss;

  if (!ctx.hasTag()) {
    module.errors.push({
      message: `Words cannot be defined before a milestone.`,
      span: glossSpan,
    });
  }

  const conflict = module.words.get(gloss);
  if (conflict !== undefined) {
    const conflictLocation = stringifySpan(conflict.definitionSite);
    module.errors.push({
      message:
        `A word with the gloss "${gloss}" is already defined at ${conflictLocation}.`,
      span: glossSpan,
    });
    return true;
  }

  const [prn, prnSpan] = stmt.pronunciation;
  const res = matchPhonemes(prn, module.listPhonemes());
  if (!res.ok) {
    module.errors.push({
      message: res.message,
      span: shiftSpan(prnSpan, res.offset),
    });
    return true;
  }
  const phonemes = res.matches.map((match) => match.phoneme);

  const definitions = stmt.definitions.map((def) => ({
    partOfSpeech: def.partOfSpeech?.[0] ?? null,
    text: def.text[0],
  }));

  module.words.set(
    gloss,
    new Word(gloss, phonemes, definitions, ctx.getTag(), glossSpan),
  );

  return true;
}

export function compileSoundChange(
  module: Module,
  ctx: Context,
  stmt: ast.SoundChange,
): boolean {
  if (!ctx.hasTag()) {
    module.errors.push({
      message: `Sound changes cannot be defined before a milestone.`,
      span: stmt.source.span,
    });
  }

  const modulePhonemes = module.listPhonemes();

  let source: Source = { kind: "empty" };
  if (stmt.source.kind === "pattern") {
    const segments = [];
    for (const seg of stmt.source.segments) {
      if (seg.kind === "phonemes") {
        const res = matchPhonemes(seg.glyphs, modulePhonemes);
        if (!res.ok) {
          module.errors.push({
            message: res.message,
            span: shiftSpan(seg.span, res.offset, 1),
          });
          return true;
        }
        segments.push(...res.matches.map((match) => match.phoneme));
      } else {
        const res = compileCategory(module, seg);
        if (!res.ok) {
          module.errors.push({
            message: res.message,
            span: res.span,
          });
          return true;
        }

        segments.push({ kind: "category", ...res.category } as const);
      }
    }
    source = { kind: "pattern", segments };
  }

  let target: Target = { kind: "empty" };
  if (stmt.target.kind === "phonemes") {
    const res = matchPhonemes(stmt.target.glyphs, modulePhonemes);
    if (!res.ok) {
      module.errors.push({
        message: res.message,
        span: shiftSpan(stmt.target.span, res.offset, 1),
      });
      return true;
    }
    target = {
      kind: "phonemes",
      phonemes: res.matches.map((ph) => ph.phoneme),
    };
  } else if (stmt.target.kind === "modification") {
    const mods: Modifier[] = [];
    const features = module.getFeatures();
    for (const mod of stmt.target.mods) {
      const feat = features.get(mod.name);
      if (feat === undefined) {
        module.errors.push({
          message: `No feature exists named "${mod.name}".`,
          span: mod.span,
        });
        return true;
      }

      mods.push({
        name: mod.name,
        sign: mod.sign,
        feature: feat,
      });
    }

    target = { kind: "modification", mods };
  }

  let environment: Environment | null = null;
  if (stmt.environment !== null) {
    const env = stmt.environment;
    const before = [];
    for (const el of env.before) {
      if (el.kind === "syllable-boundary") {
        continue;
      }

      for (const seg of el.segments) {
        if (seg.kind === "category") {
          const res = compileCategory(module, seg);
          if (!res.ok) {
            module.errors.push({
              message: res.message,
              span: res.span,
            });
            return true;
          }
          before.push({ kind: "category", ...res.category } as const);
        } else {
          const res = matchPhonemes(seg.glyphs, modulePhonemes);
          if (!res.ok) {
            module.errors.push({
              message: res.message,
              span: shiftSpan(seg.span, res.offset),
            });
            return true;
          }
          before.push(...res.matches.map((match) => match.phoneme));
        }
      }
    }

    const after = [];
    for (const el of env.after) {
      if (el.kind === "syllable-boundary") {
        continue;
      }

      for (const seg of el.segments) {
        if (seg.kind === "category") {
          const res = compileCategory(module, seg);
          if (!res.ok) {
            module.errors.push({
              message: res.message,
              span: res.span,
            });
            return true;
          }
          after.push({ kind: "category", ...res.category } as const);
        } else {
          const res = matchPhonemes(seg.glyphs, modulePhonemes);
          if (!res.ok) {
            module.errors.push({
              message: res.message,
              span: shiftSpan(seg.span, res.offset),
            });
            return true;
          }
          after.push(...res.matches.map((match) => match.phoneme));
        }
      }
    }

    environment = {
      before,
      after,
      anchorStart: stmt.environment.anchorStart,
      anchorEnd: stmt.environment.anchorEnd,
    };
  }

  module.soundChanges.push(
    new SoundChange(
      source,
      target,
      environment,
      stmt.description?.[0] ?? null,
      ctx.getTag(),
      stmt.source.span,
    ),
  );

  return true;
}
