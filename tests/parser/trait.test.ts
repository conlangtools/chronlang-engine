import { assert, assertEquals } from "jsr:@std/assert";
import { parse } from "../../src/parser.ts";

Deno.test("Parse a trait", () => {
  const source = "source-name";
  const code = `
    trait Voice { voiced, unvoiced }
  `;

  const expectedAST = [{
    kind: "trait",
    label: [
      "Voice",
      {
        source,
        start: { offset: 11, line: 2, column: 11 },
        end: { offset: 16, line: 2, column: 16 },
      },
    ],
    members: [
      {
        labels: [
          [
            "voiced",
            {
              source,
              start: { offset: 19, line: 2, column: 19 },
              end: { offset: 25, line: 2, column: 25 },
            },
          ],
        ],
        notation: null,
        default: false,
        span: {
          source,
          start: { offset: 19, line: 2, column: 19 },
          end: { offset: 25, line: 2, column: 25 },
        },
      },
      {
        labels: [
          [
            "unvoiced",
            {
              source,
              start: { offset: 27, line: 2, column: 27 },
              end: { offset: 35, line: 2, column: 35 },
            },
          ],
        ],
        notation: null,
        default: false,
        span: {
          source,
          start: { offset: 27, line: 2, column: 27 },
          end: { offset: 35, line: 2, column: 35 },
        },
      },
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a trait with a default member", () => {
  const source = "source-name";
  const code = `
    trait Voice { default voiced, unvoiced }
  `;

  const expectedAST = [{
    kind: "trait",
    label: [
      "Voice",
      {
        source,
        start: { offset: 11, line: 2, column: 11 },
        end: { offset: 16, line: 2, column: 16 },
      },
    ],
    members: [
      {
        labels: [
          [
            "voiced",
            {
              source,
              start: { offset: 27, line: 2, column: 27 },
              end: { offset: 33, line: 2, column: 33 },
            },
          ],
        ],
        notation: null,
        default: true,
        span: {
          source,
          start: { offset: 19, line: 2, column: 19 },
          end: { offset: 33, line: 2, column: 33 },
        },
      },
      {
        labels: [
          [
            "unvoiced",
            {
              source,
              start: { offset: 35, line: 2, column: 35 },
              end: { offset: 43, line: 2, column: 43 },
            },
          ],
        ],
        notation: null,
        default: false,
        span: {
          source,
          start: { offset: 35, line: 2, column: 35 },
          end: { offset: 43, line: 2, column: 43 },
        },
      },
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a trait with aliased members", () => {
  const source = "source-name";
  const code = `
    trait Voice { voiced, unvoiced|voiceless }
  `;

  const expectedAST = [{
    kind: "trait",
    label: [
      "Voice",
      {
        source,
        start: { offset: 11, line: 2, column: 11 },
        end: { offset: 16, line: 2, column: 16 },
      },
    ],
    members: [
      {
        labels: [
          [
            "voiced",
            {
              source,
              start: { offset: 19, line: 2, column: 19 },
              end: { offset: 25, line: 2, column: 25 },
            },
          ],
        ],
        notation: null,
        default: false,
        span: {
          source,
          start: { offset: 19, line: 2, column: 19 },
          end: { offset: 25, line: 2, column: 25 },
        },
      },
      {
        labels: [
          [
            "unvoiced",
            {
              source,
              start: { offset: 27, line: 2, column: 27 },
              end: { offset: 35, line: 2, column: 35 },
            },
          ],
          [
            "voiceless",
            {
              source,
              start: { offset: 36, line: 2, column: 36 },
              end: { offset: 45, line: 2, column: 45 },
            },
          ],
        ],
        notation: null,
        default: false,
        span: {
          source,
          start: { offset: 27, line: 2, column: 27 },
          end: { offset: 45, line: 2, column: 45 },
        },
      },
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a trait with linebreaks", () => {
  const source = "source-name";
  const code = `
    trait Voice {
      default voiced,
      unvoiced | voiceless
    }
  `;

  const expectedAST = [{
    kind: "trait",
    label: [
      "Voice",
      {
        source,
        start: { offset: 11, line: 2, column: 11 },
        end: { offset: 16, line: 2, column: 16 },
      },
    ],
    members: [
      {
        labels: [
          [
            "voiced",
            {
              source,
              start: { offset: 33, line: 3, column: 15 },
              end: { offset: 39, line: 3, column: 21 },
            },
          ],
        ],
        notation: null,
        default: true,
        span: {
          source,
          start: { offset: 25, line: 3, column: 7 },
          end: { offset: 39, line: 3, column: 21 },
        },
      },
      {
        labels: [
          [
            "unvoiced",
            {
              source,
              start: { offset: 47, line: 4, column: 7 },
              end: { offset: 55, line: 4, column: 15 },
            },
          ],
          [
            "voiceless",
            {
              source,
              start: { offset: 58, line: 4, column: 18 },
              end: { offset: 67, line: 4, column: 27 },
            },
          ],
        ],
        notation: null,
        default: false,
        span: {
          source,
          start: { offset: 47, line: 4, column: 7 },
          end: { offset: 67, line: 4, column: 27 },
        },
      },
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});
