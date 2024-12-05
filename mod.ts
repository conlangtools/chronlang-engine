/**
 * @module
 * This module contains the compileModule function for compiling Chronlang modules,
 * and the key types necessary for working with the compiled module.
 *
 * @example
 * ```ts
 * import { compileModule, type ModuleResolver, type Module } from "@conlangtools/chronlang-engine";
 *
 * class MyModuleResolver extends ModuleResolver {
 *   // implement the interface
 * }
 *
 * const sourceFile = "example.lang";
 * const source = Deno.readTextFileSync(sourceFile);
 * const moduleResolver = new MyModuleResolver();
 *
 * const module: Module = compileModule(source, sourceFile, moduleResolver);
 * ```
 */

export { compileModule, type ModuleResolver } from "./lib/compiler.ts";
export { Module, type Snapshot } from "./lib/module.ts";
export type { Language, Tag } from "./lib/diachronics.ts";
export type { Word } from "./lib/word.ts";
export type { SoundChange } from "./lib/sound-change.ts";
