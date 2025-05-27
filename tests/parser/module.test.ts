/*
  Tests ensuring the parser can handle large inputs
  & sequences of many statements.
*/

import { assert, assertEquals } from "jsr:@std/assert";
import { parse } from "../../src/parser.ts";

Deno.test("Parse a sequence of statements", () => {
  const source = `
    import * from @core/ipa
    import {
      a, e, i, o, u
    } from ./local/vowels
          
    series F = { i, e, ε, æ }

    class X encodes (Place Manner) {
      ℂ = velar trill,
      ℤ = labiodental lateralFricative,
    }

    lang OEng : Old English // This isn't part of the name
    lang AmEng < OEng : American English
    lang RP < OEng : Received Pronunciation

    @ 1000, OEng
    @ 1940, AmEng

    - water /ˈwæ.ter/ {
      noun. liquid that forms the seas, lakes, rivers, and rain
      verb. pour or sprinkle water over a plant or area
    }

    $ [C+alveolar+stop] > [+flap] / V_V : Alveolar stops lenite to flaps intervocallically
  `;

  const result = parse(source, "source-name");
  assert(result.ok);
  assertEquals(result.statements.length, 11);
});
