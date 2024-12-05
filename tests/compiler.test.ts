import { assertEquals } from "jsr:@std/assert/equals";
import { compileModule, stringifySpan } from "../lib/compiler.ts";
import resolver from "./mock-resolver.ts";

Deno.test("it works", () => {
  const source = "source-name";
  const code = `
    import { C, V } from @core/ipa

    lang TP: Toki Pona
    lang DB < TP: Dutse Bon

    @ 0, TP

    - speech /toki/
    - good /pona/
    - mushroom /soko/

    @ 10, DB

    $ o > ʌ                         : /o/ becomes /ʌ/
    $ [C+velar] > [+palatal] / _i   : velars are palatalised before /i/
    $ [V-rounded] > ə               : unrounded vowels become ə word finally

    @ 20

    $ ə > e / [C+palatal]_              : ə becomes e after palatals
    $ [C] > [+voiced] / #_              : consonants are voiced word initially
    $ [V] > [+rounded] / [C+bilabial]_  : vowels are rounded following bilabials

    @ 30

    $ c > t͡s        : c lenites to t͡s
    $ ə > [] / _#   : word-final schwa is lost
  `;

  const module = compileModule(code, source, resolver);

  assertEquals(module.errors.length, 0);
  assertEquals(module.warnings.length, 0);
});
