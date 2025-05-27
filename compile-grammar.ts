const grammar = Deno.readTextFileSync("./src/grammar.pegjs");

Deno.writeTextFileSync(
  "src/grammar.ts",
  `\
const grammar: string = String.raw\`\
${grammar}
\`

export default grammar;
`,
);
