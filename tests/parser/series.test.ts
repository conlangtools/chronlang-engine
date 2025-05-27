import { assert, assertEquals } from "jsr:@std/assert";
import { parse } from "../../src/parser.ts";

Deno.test("Parse a category series", () => {
  const source = "source-name";
  const code = `
    series F = [C+fricative]
  `;

  const expectedAST = [{
    kind: "series",
    label: [
      "F",
      {
        source,
        start: { offset: 12, line: 2, column: 12 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ],
    seriesKind: "category",
    baseClass: [
      "C",
      {
        source,
        start: { offset: 17, line: 2, column: 17 },
        end: { offset: 18, line: 2, column: 18 },
      },
    ],
    features: [
      {
        sign: "positive",
        name: "fricative",
        span: {
          source,
          start: { offset: 18, line: 2, column: 18 },
          end: { offset: 28, line: 2, column: 28 },
        },
      },
    ],
    span: {
      source,
      start: { offset: 16, line: 2, column: 16 },
      end: { offset: 29, line: 2, column: 29 },
    },
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a category series with no modifiers", () => {
  const source = "source-name";
  const code = `
    series V = [Vowels]
  `;

  const expectedAST = [{
    kind: "series",
    label: [
      "V",
      {
        source,
        start: { offset: 12, line: 2, column: 12 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ],
    seriesKind: "category",
    baseClass: [
      "Vowels",
      {
        source,
        start: { offset: 17, line: 2, column: 17 },
        end: { offset: 23, line: 2, column: 23 },
      },
    ],
    features: [],
    span: {
      source,
      start: { offset: 16, line: 2, column: 16 },
      end: { offset: 24, line: 2, column: 24 },
    },
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a list series", () => {
  const source = "source-name";
  const code = `
    series P = { p, t, k }
  `;

  const expectedAST = [{
    kind: "series",
    label: [
      "P",
      {
        source,
        start: { offset: 12, line: 2, column: 12 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ],
    seriesKind: "list",
    phonemes: [
      [
        "p",
        {
          source,
          start: { offset: 18, line: 2, column: 18 },
          end: { offset: 19, line: 2, column: 19 },
        },
      ],
      [
        "t",
        {
          source,
          start: { offset: 21, line: 2, column: 21 },
          end: { offset: 22, line: 2, column: 22 },
        },
      ],
      [
        "k",
        {
          source,
          start: { offset: 24, line: 2, column: 24 },
          end: { offset: 25, line: 2, column: 25 },
        },
      ],
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});
