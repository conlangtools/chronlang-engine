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

export { compileModule, type ModuleResolver } from "./compiler.ts";
export { Module, type Snapshot } from "./module.ts";
export type { Language, Milestone, Tag } from "./diachronics.ts";
export type { Word } from "./word.ts";
export type { SoundChange } from "./sound-change.ts";
