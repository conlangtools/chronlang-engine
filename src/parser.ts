/**
 * @module
 * This module contains the reference parser for the Chronlang
 * conlang definition language.
 *
 * ``
 */

import peggy from "peggy";
import grammar from "./grammar.ts";
import type { Span, Stmt } from "./ast/mod.ts";

const parser: peggy.Parser = peggy.generate(grammar);

export type SyntaxError = peggy.parser.SyntaxError;

type ParseResult =
  | { ok: true; statements: readonly Stmt[] }
  | { ok: false; error: SyntaxError; span: Span };

/**
 * Parse a string of Chronlang source code into a
 * sequence of {@link Stmt}s
 */
export function parse(source: string, sourceName: string): ParseResult {
  try {
    const statements = parser.parse(source, { grammarSource: sourceName });
    return { ok: true, statements };
  } catch (error) {
    if (error instanceof parser.SyntaxError) {
      return { ok: false, error, span: error.location };
    }

    throw error;
  }
}
