import { assert, assertEquals } from "jsr:@std/assert";
import { parse } from "../../src/parser.ts";

Deno.test("Parse a wildcard import from a local, relative path", () => {
  const source = "source-name";
  const code = `
    import * from ./local/path
  `;

  const expectedAST = [{
    kind: "import",
    scoped: false,
    absolute: false,
    path: [
      "./local/path",
      {
        source,
        start: { offset: 19, line: 2, column: 19 },
        end: { offset: 31, line: 2, column: 31 },
      },
    ],
    names: [[
      "*",
      {
        source,
        start: { offset: 12, line: 2, column: 12 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ]],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a wildcard import from a local, absolute path", () => {
  const source = "source-name";
  const code = `
    import * from /absolute/path
  `;

  const expectedAST = [{
    kind: "import",
    scoped: false,
    absolute: true,
    path: [
      "absolute/path",
      {
        source,
        start: { offset: 19, line: 2, column: 19 },
        end: { offset: 33, line: 2, column: 33 },
      },
    ],
    names: [[
      "*",
      {
        source,
        start: { offset: 12, line: 2, column: 12 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ]],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a wildcard import from a scoped path", () => {
  const source = "source-name";
  const code = `
    import * from @core/ipa
  `;

  const expectedAST = [{
    kind: "import",
    scoped: true,
    scope: [
      "core",
      {
        source,
        start: { offset: 19, line: 2, column: 19 },
        end: { offset: 24, line: 2, column: 24 },
      },
    ],
    path: [
      "/ipa",
      {
        source,
        start: { offset: 24, line: 2, column: 24 },
        end: { offset: 28, line: 2, column: 28 },
      },
    ],
    names: [[
      "*",
      {
        source,
        start: { offset: 12, line: 2, column: 12 },
        end: { offset: 13, line: 2, column: 13 },
      },
    ]],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a list import", () => {
  const source = "source-name";
  const code = `
    import { x, y, foo, bar } from some/module
  `;

  const expectedAST = [{
    kind: "import",
    scoped: false,
    absolute: false,
    path: [
      "some/module",
      {
        source,
        start: { offset: 36, line: 2, column: 36 },
        end: { offset: 47, line: 2, column: 47 },
      },
    ],
    names: [
      [
        "x",
        {
          source,
          start: { offset: 14, line: 2, column: 14 },
          end: { offset: 15, line: 2, column: 15 },
        },
      ],
      [
        "y",
        {
          source,
          start: { offset: 17, line: 2, column: 17 },
          end: { offset: 18, line: 2, column: 18 },
        },
      ],
      [
        "foo",
        {
          source,
          start: { offset: 20, line: 2, column: 20 },
          end: { offset: 23, line: 2, column: 23 },
        },
      ],
      [
        "bar",
        {
          source,
          start: { offset: 25, line: 2, column: 25 },
          end: { offset: 28, line: 2, column: 28 },
        },
      ],
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});

Deno.test("Parse a list import with linebreaks", () => {
  const source = "source-name";
  const code = `
    import {
      Place,
      Manner
    } from some/module
  `;

  const expectedAST = [{
    kind: "import",
    scoped: false,
    absolute: false,
    path: [
      "some/module",
      {
        source,
        start: { offset: 51, line: 5, column: 12 },
        end: { offset: 62, line: 5, column: 23 },
      },
    ],
    names: [
      [
        "Place",
        {
          source,
          start: { offset: 20, line: 3, column: 7 },
          end: { offset: 25, line: 3, column: 12 },
        },
      ],
      [
        "Manner",
        {
          source,
          start: { offset: 33, line: 4, column: 7 },
          end: { offset: 39, line: 4, column: 13 },
        },
      ],
    ],
  }] as const;

  const result = parse(code, source);
  assert(result.ok);
  assertEquals(result.statements, expectedAST);
});
