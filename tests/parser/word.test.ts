import { assert, assertEquals } from "jsr:@std/assert";
import { parse } from "../../src/parser.ts";

Deno.test("Parse a minimal word definition", () => {
  const source = "source-name";
  const code = `
    - water /wa.ter/
  `;

  const expectedAST = [{
    kind: "word",
    gloss: [
      "water",
      {
        source,
        start: { offset: 7, line: 2, column: 7 },
        end: { offset: 12, line: 2, column: 12 },
      },
    ],
    pronunciation: [
      "wa.ter",
      {
        source,
        start: { offset: 13, line: 2, column: 13 },
        end: { offset: 21, line: 2, column: 21 },
      },
    ],
    definitions: [],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a word definition with a simple definition", () => {
  const source = "source-name";
  const code = `
    - water /wa.ter/ : The liquid form of H2O
  `;

  const expectedAST = [{
    kind: "word",
    gloss: [
      "water",
      {
        source,
        start: { offset: 7, line: 2, column: 7 },
        end: { offset: 12, line: 2, column: 12 },
      },
    ],
    pronunciation: [
      "wa.ter",
      {
        source,
        start: { offset: 13, line: 2, column: 13 },
        end: { offset: 21, line: 2, column: 21 },
      },
    ],
    definitions: [
      {
        partOfSpeech: null,
        text: [
          "The liquid form of H2O",
          {
            source,
            start: { offset: 24, line: 2, column: 24 },
            end: { offset: 46, line: 2, column: 46 },
          },
        ],
      },
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a word definition with multiple definitions", () => {
  const source = "source-name";
  const code = `
    - water /wa.ter/ {
      noun. the liquid form of H2O
      verb. to pour water over a plant
    }
  `;

  const expectedAST = [{
    kind: "word",
    gloss: [
      "water",
      {
        source,
        start: { offset: 7, line: 2, column: 7 },
        end: { offset: 12, line: 2, column: 12 },
      },
    ],
    pronunciation: [
      "wa.ter",
      {
        source,
        start: { offset: 13, line: 2, column: 13 },
        end: { offset: 21, line: 2, column: 21 },
      },
    ],
    definitions: [
      {
        partOfSpeech: [
          "noun",
          {
            source,
            start: { offset: 30, line: 3, column: 7 },
            end: { offset: 34, line: 3, column: 11 },
          },
        ],
        text: [
          "the liquid form of H2O",
          {
            source,
            start: { offset: 36, line: 3, column: 13 },
            end: { offset: 58, line: 3, column: 35 },
          },
        ],
      },
      {
        partOfSpeech: [
          "verb",
          {
            source,
            start: { offset: 65, line: 4, column: 7 },
            end: { offset: 69, line: 4, column: 11 },
          },
        ],
        text: [
          "to pour water over a plant",
          {
            source,
            start: { offset: 71, line: 4, column: 13 },
            end: { offset: 97, line: 4, column: 39 },
          },
        ],
      },
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});
