import { compileModule } from "./src/mod.ts";
import mockResolver from "./tests/mock-resolver.ts";

const src = `
import { C, V } from @core/ipa

lang ON: Old Norse
lang EI < ON: Early Icelandic
lang IC < EI: Icelandic
lang MI < IC: Modern Icelandic

class N {
    ã,
    õ,
    ĩ,
}

@ 1350, ON

// Pronouns & Basic Function Words

- I /ek/ {
    pronoun. I
}

- you /θu/ {
    pronoun. You (singular)
}

- he /han/ {
    pronoun. He
}

- she /hon/ {
    pronoun. She
}

- we /ver/ {
    pronoun. We
}

- youpl /θer/ {
    pronoun. You (plural)
}

- they /θeir/ {
    pronoun. They (singular)
}

- theypl /θau/ {
    pronoun. They (plural)
}

- my /min/ {
    poss. My
}

- your /θin/ {
    poss. Your
}

- own /sin/ {
    poss. His/her/its own
}

- and /ok/ {
    conj. and
}

- or /eða/ {
    conj. or
}

- but /en/ {
    conj. but
}

- because /θvi/ {
    conj. because
}

- if /ev/ {
    conj. if
}

- that /at/ {
    conj. that
}

- with /með/ {
    prep. with
}

- to /til/ {
    prep. to
}

// Numbers

- one /ein/ {
    noun. one
}

- two /tveir/ {
    noun. two
}

- three /θrir/ {
    noun. three
}

- four /fjorir/ {
    noun. four
}

- five /fimm/ {
    noun. five
}

- six /seks/ {
    noun. six
}

- seven /sjau/ {
    noun. seven
}

- eight /atta/ {
    noun. eight
}

- nine /niu/ {
    noun. nine
}

- ten /tiu/ {
    noun. ten
}

@ 1500..1550, ON

$ k > ʃ
$ t > k
$ ʃ > tʃ
$ ʃs > ʃ

@ 1550..1600, ON

$ θ > f
$ ð > v
$ fv > []
$ il > yl
$ rir > ir

@ 1600..1750, ON

$ ve > e
$ an > ã
$ on > õ
$ in > ĩ
$ fa > a
$ fj > ç


@ 1750..2000, EI

$ ã > a
$ õ > o
$ ĩ > i
$ ei > ai
$ air > ai
$ et > it
$ ky > y
$ ç > s

@ 2000, IC

- also /otʃõ/ {
    conj. also
}

$ õ > on

@ 2300, MI
`

const mod = compileModule(src, "module", mockResolver)

for (const milestone of mod.milestones) {
  const snap = mod.snapshot(milestone.language, milestone.starts)
  const word = snap.words.find(w => w.gloss === "also")
  console.log(milestone.starts, milestone.language.id, word?.render())
}
