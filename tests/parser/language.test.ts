import { assert, assertEquals } from "jsr:@std/assert";
import { parse } from "../../src/parser.ts";

Deno.test("Parse a language definition with no name or parent", () => {
  const source = "source-name";
  const code = `
    lang PAM
  `;

  const expectedAST = [{
    kind: "language",
    id: [
      "PAM",
      {
        source,
        start: { offset: 10, line: 2, column: 10 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ],
    name: null,
    parent: null,
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a language definition with a name but no parent", () => {
  const source = "source-name";
  const code = `
    lang PAM: Proto-Auzger-Morlan
  `;

  const expectedAST = [{
    kind: "language",
    id: [
      "PAM",
      {
        source,
        start: { offset: 10, line: 2, column: 10 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ],
    name: [
      "Proto-Auzger-Morlan",
      {
        source,
        start: { offset: 15, line: 2, column: 15 },
        end: { offset: 34, line: 2, column: 34 },
      },
    ],
    parent: null,
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Don't include comments in language names", () => {
  const source = "source-name";
  const code = `
    lang PAM: Proto-Auzger-Morlan// This isn't part of the name
  `;

  const expectedAST = [{
    kind: "language",
    id: [
      "PAM",
      {
        source,
        start: { offset: 10, line: 2, column: 10 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ],
    name: [
      "Proto-Auzger-Morlan",
      {
        source,
        start: { offset: 15, line: 2, column: 15 },
        end: { offset: 34, line: 2, column: 34 },
      },
    ],
    parent: null,
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a language definition with a parent but no name", () => {
  const source = "source-name";
  const code = `
    lang PAM < PAu
  `;

  const expectedAST = [{
    kind: "language",
    id: [
      "PAM",
      {
        source,
        start: { offset: 10, line: 2, column: 10 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ],
    name: null,
    parent: [
      "PAu",
      {
        source,
        start: { offset: 16, line: 2, column: 16 },
        end: { offset: 19, line: 2, column: 19 },
      },
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a language definition with a name and a parent", () => {
  const source = "source-name";
  const code = `
    lang PAM < PAu: Proto-Auzger-Morlan
  `;

  const expectedAST = [{
    kind: "language",
    id: [
      "PAM",
      {
        source,
        start: { offset: 10, line: 2, column: 10 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ],
    name: [
      "Proto-Auzger-Morlan",
      {
        source,
        start: { offset: 21, line: 2, column: 21 },
        end: { offset: 40, line: 2, column: 40 },
      },
    ],
    parent: [
      "PAu",
      {
        source,
        start: { offset: 16, line: 2, column: 16 },
        end: { offset: 19, line: 2, column: 19 },
      },
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});
