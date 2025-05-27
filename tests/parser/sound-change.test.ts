import { assert, assertEquals } from "jsr:@std/assert";
import { parse } from "../../src/parser.ts";

Deno.test("Parse a minimal sound change", () => {
  const source = "source-name";
  const code = `
    $ a > b
  `;

  const expectedAST = [{
    kind: "sound-change",
    source: {
      kind: "pattern",
      segments: [{
        kind: "phonemes",
        glyphs: "a",
        span: {
          source,
          start: { offset: 7, line: 2, column: 7 },
          end: { offset: 8, line: 2, column: 8 },
        },
      }],
      span: {
        source,
        start: { offset: 7, line: 2, column: 7 },
        end: { offset: 8, line: 2, column: 8 },
      },
    },
    target: {
      kind: "phonemes",
      glyphs: "b",
      span: {
        source,
        start: { offset: 11, line: 2, column: 11 },
        end: { offset: 12, line: 2, column: 12 },
      },
    },
    environment: null,
    description: null,
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a sound change with an empty source", () => {
  const source = "source-name";
  const code = `
    $ [] > x
  `;

  const expectedAST = [{
    kind: "sound-change",
    source: {
      kind: "empty",
      span: {
        source,
        start: { offset: 7, line: 2, column: 7 },
        end: { offset: 9, line: 2, column: 9 },
      },
    },
    target: {
      kind: "phonemes",
      glyphs: "x",
      span: {
        source,
        start: { offset: 12, line: 2, column: 12 },
        end: { offset: 13, line: 2, column: 13 },
      },
    },
    environment: null,
    description: null,
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a sound change with an empty target", () => {
  const source = "source-name";
  const code = `
    $ x > []
  `;

  const expectedAST = [{
    kind: "sound-change",
    source: {
      kind: "pattern",
      segments: [{
        kind: "phonemes",
        glyphs: "x",
        span: {
          source,
          start: { offset: 7, line: 2, column: 7 },
          end: { offset: 8, line: 2, column: 8 },
        },
      }],
      span: {
        source,
        start: { offset: 7, line: 2, column: 7 },
        end: { offset: 8, line: 2, column: 8 },
      },
    },
    target: {
      kind: "empty",
      span: {
        source,
        start: { offset: 11, line: 2, column: 11 },
        end: { offset: 13, line: 2, column: 13 },
      },
    },
    environment: null,
    description: null,
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a sound change with a description", () => {
  const source = "source-name";
  const code = `
    $ a > b: /a/ becomes /b/
  `;

  const expectedAST = [{
    kind: "sound-change",
    source: {
      kind: "pattern",
      segments: [{
        kind: "phonemes",
        glyphs: "a",
        span: {
          source,
          start: { offset: 7, line: 2, column: 7 },
          end: { offset: 8, line: 2, column: 8 },
        },
      }],
      span: {
        source,
        start: { offset: 7, line: 2, column: 7 },
        end: { offset: 8, line: 2, column: 8 },
      },
    },
    target: {
      kind: "phonemes",
      glyphs: "b",
      span: {
        source,
        start: { offset: 11, line: 2, column: 11 },
        end: { offset: 12, line: 2, column: 12 },
      },
    },
    environment: null,
    description: [
      "/a/ becomes /b/",
      {
        source,
        start: { offset: 14, line: 2, column: 14 },
        end: { offset: 29, line: 2, column: 29 },
      },
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a sound change with an environment", () => {
  const source = "source-name";
  const code = `
    $ k > c / #_i
  `;

  const expectedAST = [{
    kind: "sound-change",
    source: {
      kind: "pattern",
      segments: [{
        kind: "phonemes",
        glyphs: "k",
        span: {
          source,
          start: { offset: 7, line: 2, column: 7 },
          end: { offset: 8, line: 2, column: 8 },
        },
      }],
      span: {
        source,
        start: { offset: 7, line: 2, column: 7 },
        end: { offset: 8, line: 2, column: 8 },
      },
    },
    target: {
      kind: "phonemes",
      glyphs: "c",
      span: {
        source,
        start: { offset: 11, line: 2, column: 11 },
        end: { offset: 12, line: 2, column: 12 },
      },
    },
    environment: {
      before: [],
      after: [
        {
          kind: "pattern",
          segments: [
            {
              kind: "phonemes",
              glyphs: "i",
              span: {
                source,
                start: { offset: 17, line: 2, column: 17 },
                end: { offset: 18, line: 2, column: 18 },
              },
            },
          ],
          span: {
            source,
            start: { offset: 17, line: 2, column: 17 },
            end: { offset: 18, line: 2, column: 18 },
          },
        },
      ],
      anchorStart: true,
      anchorEnd: false,
      span: {
        source,
        start: { offset: 15, line: 2, column: 15 },
        end: { offset: 18, line: 2, column: 18 },
      },
    },
    description: null,
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});
