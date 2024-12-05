import { MockResolver } from "../lib/compiler.ts";

export default new MockResolver(
  new Map([
    ["@core/ipa", Deno.readTextFileSync("./stdlib/core/ipa.lang")],
  ]),
);
