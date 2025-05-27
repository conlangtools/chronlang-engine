import { assert, assertEquals } from "jsr:@std/assert";
import { parse } from "../../src/parser.ts";

Deno.test("Parse a trait", () => {
  const source = "source-name";
  const code = `
    class Consonant encodes (Voice Place Manner) {
      p = unvoiced bilabial stop,
      b = voiced bilabial stop
    }
  `;

  const expectedAST = [{
    kind: "class",
    label: [
      "Consonant",
      {
        source,
        start: { offset: 11, line: 2, column: 11 },
        end: { offset: 20, line: 2, column: 20 },
      },
    ],
    encodes: [
      [
        "Voice",
        {
          source,
          start: { offset: 30, line: 2, column: 30 },
          end: { offset: 35, line: 2, column: 35 },
        },
      ],
      [
        "Place",
        {
          source,
          start: { offset: 36, line: 2, column: 36 },
          end: { offset: 41, line: 2, column: 41 },
        },
      ],
      [
        "Manner",
        {
          source,
          start: { offset: 42, line: 2, column: 42 },
          end: { offset: 48, line: 2, column: 48 },
        },
      ],
    ],
    annotates: [],
    phonemes: [
      {
        label: [
          "p",
          {
            source,
            start: { offset: 58, line: 3, column: 7 },
            end: { offset: 59, line: 3, column: 8 },
          },
        ],
        traits: [
          [
            "unvoiced",
            {
              source,
              start: { offset: 62, line: 3, column: 11 },
              end: { offset: 70, line: 3, column: 19 },
            },
          ],
          [
            "bilabial",
            {
              source,
              start: { offset: 71, line: 3, column: 20 },
              end: { offset: 79, line: 3, column: 28 },
            },
          ],
          [
            "stop",
            {
              source,
              start: { offset: 80, line: 3, column: 29 },
              end: { offset: 84, line: 3, column: 33 },
            },
          ],
        ],
        span: {
          source,
          start: { offset: 58, line: 3, column: 7 },
          end: { offset: 84, line: 3, column: 33 },
        },
      },
      {
        label: [
          "b",
          {
            source,
            start: { offset: 92, line: 4, column: 7 },
            end: { offset: 93, line: 4, column: 8 },
          },
        ],
        traits: [
          [
            "voiced",
            {
              source,
              start: { offset: 96, line: 4, column: 11 },
              end: { offset: 102, line: 4, column: 17 },
            },
          ],
          [
            "bilabial",
            {
              source,
              start: { offset: 103, line: 4, column: 18 },
              end: { offset: 111, line: 4, column: 26 },
            },
          ],
          [
            "stop",
            {
              source,
              start: { offset: 112, line: 4, column: 27 },
              end: { offset: 116, line: 4, column: 31 },
            },
          ],
        ],
        span: {
          source,
          start: { offset: 92, line: 4, column: 7 },
          end: { offset: 116, line: 4, column: 31 },
        },
      },
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});
