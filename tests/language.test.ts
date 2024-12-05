import { compileModule } from "../lib/compiler.ts";
import { assertEquals } from "jsr:@std/assert";
import resolver from "./mock-resolver.ts";

Deno.test("compile a language", () => {
  const source = "source-name";
  const code = `
    lang PA
  `;
  
  const module = compileModule(code, source, resolver);

  assertEquals(module.errors.length, 0);
  assertEquals(module.languages.size, 1);
  assertEquals(module.languages.get("PA"), {
    kind: "language",
    id: "PA",
    name: "PA",
    parent: null,
    definitionSite: {
      source,
      start: { offset: 10, line: 2, column: 10 },
      end: { offset: 12, line: 2, column: 12 },
    },
  });
});

Deno.test("compile a language with a name", () => {
  const source = "source-name";
  const code = `
    lang PA: Proto-Arinaga
  `;
  
  const module = compileModule(code, source, resolver);

  assertEquals(module.errors.length, 0);
  assertEquals(module.languages.size, 1);
  assertEquals(module.languages.get("PA"), {
    kind: "language",
    id: "PA",
    name: "Proto-Arinaga",
    parent: null,
    definitionSite: {
      source,
      start: { offset: 10, line: 2, column: 10 },
      end: { offset: 12, line: 2, column: 12 },
    },
  });
});

Deno.test("compile a language family", () => {
  const source = "source-name";
  const code = `
    lang PA: Proto-Arinaga
    lang PAuM < PA: Proto-Auzger-Morlan
    lang PC < PA: Proto-Canolze
  `;

  const module = compileModule(code, source, resolver);

  assertEquals(module.errors.length, 0);
  assertEquals(module.languages.size, 3);

  const expectedParent = {
    kind: "language",
    id: "PA",
    name: "Proto-Arinaga",
    parent: null,
    definitionSite: {
      source,
      start: { offset: 10, line: 2, column: 10 },
      end: { offset: 12, line: 2, column: 12 },
    },
  } as const;

  assertEquals(module.languages.get("PA"), expectedParent);

  assertEquals(module.languages.get("PAuM"), {
    kind: "language",
    id: "PAuM",
    name: "Proto-Auzger-Morlan",
    parent: expectedParent,
    definitionSite: {
      source,
      start: { offset: 37, line: 3, column: 10 },
      end: { offset: 41, line: 3, column: 14 },
    },
  });

  assertEquals(module.languages.get("PC"), {
    kind: "language",
    id: "PC",
    name: "Proto-Canolze",
    parent: expectedParent,
    definitionSite: {
      source,
      start: { offset: 77, line: 4, column: 10 },
      end: { offset: 79, line: 4, column: 12 },
    },
  });
});

Deno.test("raise an error for conflicts", () => {
  const source = "source-name";
  const code = `
    lang PA
    lang PA
  `;
  const module = compileModule(code, source, resolver);

  assertEquals(module.languages.size, 1);
  assertEquals(module.languages.get("PA"), {
    kind: "language",
    id: "PA",
    name: "PA",
    parent: null,
    definitionSite: {
      source,
      start: { offset: 10, line: 2, column: 10 },
      end: { offset: 12, line: 2, column: 12 },
    },
  });

  assertEquals(module.errors.length, 1);
  assertEquals(module.errors[0].span, {
    source,
    start: { offset: 22, line: 3, column: 10 },
    end: { offset: 24, line: 3, column: 12 },
  });
});

Deno.test("raise an error for missing parent", () => {
  const source = "source-name";
  const code = `
    lang PA < NO
  `;
  
  const module = compileModule(code, source, resolver);

  assertEquals(module.languages.size, 1);
  assertEquals(module.languages.get("PA"), {
    kind: "language",
    id: "PA",
    name: "PA",
    parent: null,
    definitionSite: {
      source,
      start: { offset: 10, line: 2, column: 10 },
      end: { offset: 12, line: 2, column: 12 },
    },
  });

  assertEquals(module.errors.length, 1);
  assertEquals(module.errors[0].span, {
    source,
    start: { offset: 15, line: 2, column: 15 },
    end: { offset: 17, line: 2, column: 17 },
  });
});
