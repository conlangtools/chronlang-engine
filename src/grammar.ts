const grammar: string = String
  .raw`start = eol? stmts:statement|1.., eol| eol? !.
        { return stmts.filter(stmt => typeof stmt !== "string") }

statement
  = import
  / languageDefinition
  / milestone
  / traitDefinition
  / classDefinition
  / seriesDefinition
  / wordDefinition
  / soundChangeDefinition
  / comment


// COMMON

_  "inline whitespace" = [ \t]*       { return "WS" }
__ "whitespace" = [ \t\r\n]*          { return "WS" }
eol "newline" = _ comment? [\r\n]+ __ { return "EOL" }

comment = "//" text:$(!eol .)* { return text.trim() }

projectIdent = $projectIdentChar+
projectIdentChar = [a-z0-9-]i

specialChar = "[" / "]" / "{" / "}" / "(" / ")" / "-"
            / "+" / ">" / "<" / "/" / "_" / "#" / "."
            / ":" / "$" / "@" / "," / "'" / "\"" / "|"

ident = text:$identChar+ { return [text, location()] }
identChar = !specialChar
    [\u0021-\u007E]        // Basic Latin (excluding C0 Controls, space & delete)
  / [\u00A1-\u00FF]        // Latin-1 Supplement (excluding C1 Controls & non-breaking space)
  / [\u0100-\u017F]        // Latin Extended-A
  / [\u0180-\u024F]        // Latin Extended-B
  / [\u0250-\u02AF]        // IPA Extensions
  / [\u035C]               // Combining Double Breve Below
  / [\u0361]               // Combining Double Inverted Breve
  / [\u0370-\u0373]        // Greek and Coptic (excluding modifiers and diacritics)
  / [\u0376-\u0377]
  / [\u037B-\u037D]
  / "\u037F"
  / [\u0386-\u03FF]
  / [\u2C60-\u2C7F]        // Latin Extended-C
  / [\u1D00-\u1D2B]        // Phonetic Extensions (excluding superscripts)
  / [\u1D6B-\u1D77]
  / [\u1D79-\u1D7F]
  / [\u1D80-\u1D9A]        // Phonetic Extensions Supplement (excluding superscripts)
  / [\uA722-\uA7FF]        // Latin Extended-D
  / [\uAB30-\uAB68]        // Latin Extended-E
  // [\u{10780}-\u{107BA}]  // Latin Extended-F
  // [\u{1DF00}-\u{1DF2A}]  // Latin Extended-G
  // [\u{1D400}-\u{1D7FF}]  // Mathematical Alphanumeric Symbols
  / [\u2100-\u214F]        // Letterlike Symbols

number = digits:$[0-9]+ { return parseInt(digits, 10) }

featurePrefix = sign:("+" / "-")
  { return sign === "+" ? "positive" : "negative" }
feature = sign:featurePrefix name:ident
  { return { sign, name: name[0], span: location() } }
category = "[" baseClass:ident? features:feature* "]"
  { return { baseClass, features, span: location() } }

// IMPORTS

import "import" = "import" _ names:importList _ "from" _ path:importPath
                  { return { kind: "import", names, ...path } }

importList = importNames / importStar
importNames = "{" __ names:ident|1.., "," __| ","? __ "}" { return names }
importStar = "*" { return [["*", location()]] }

importPath = scopedImportPath / localImportPath

scopedImportPath = scope:importScope path:($("/" projectIdent)+ { return [text(), location()] })
                   { return { scoped: true, path, scope } }
importScope = "@" scope:projectIdent { return [scope, location()] }

localImportPath = slash:"/"? path:$localImportSegment|1.., "/"|
                  { return { scoped: false, path: [path, location()], absolute: slash !== null } }
localImportSegment = projectIdent / ".." / "."


// LANGUAGE

languageDefinition "language definition" = "lang" _ id:ident parent:parentClause? name:langNameClause?
                                           { return { kind: "language", id, parent: parent, name } }
parentClause = _ "<" _ id:ident { return id }
langNameClause = _ ":" _ name:(text:$(!eol .)* { return [text, location()] }) { return name }


// MILESTONE

milestone "milestone" = "@" _ time:time language:milestoneLanguage?
                        { return { kind: "milestone", time, language } }

time = time:(instant / range)
       { return { ...time, span: location() } }

range = closedRange / openRange
closedRange = start:number _ ".." _ end: number { return { kind: "closed-range", start, end } }
openRange = start:number { return { kind: "open-range", start } }

instant = time:number "!" { return { kind: "instant", time } }

milestoneLanguage = _ "," _ lang:ident { return lang }


// TRAIT

traitDefinition = "trait" _ label:ident _ members:traitMembers
                  { return { kind: "trait", label, members } }

traitMembers = "{" __ members:traitMember|1.., "," __| _ ","? __ "}" { return members }
traitMember = def:"default"? _ labels:ident|1.., _ "|" _|
              { return { labels, default: def !== null, notation: null, span: location() } }


// CLASS

classDefinition = "class" _ label:ident _ encodes:encodesClause? _ phonemes:classBody
                  { return { kind: "class", label, encodes: encodes ?? [], annotates: [], phonemes } }

encodesClause = "encodes" _ "(" xs:(_ x:ident { return x })+ _ ")" { return xs }
classBody = "{" __ xs:classMember|1.., "," __| _ ","? __ "}" { return xs }
classMember = label:ident ts:(_ "=" _ ident|1.., _|)?
              { return { label, traits: ts?.[3] ?? [], span: location() } }


// SERIES

seriesDefinition "series definition" = "series" _ label:ident _ "=" _ body:seriesBody
                                       { return { kind: "series", label, ...body } }

seriesBody = cat:category   { return { seriesKind: "category", ...cat } }
           / ps:phonemeList { return { seriesKind: "list", phonemes: ps } }
phonemeList = "{" __ ps:ident|1.., "," __| ","? __ "}" { return ps }


// WORD

wordDefinition "word definition" = "-" _ gloss:ident _ pronunciation:ipaString defs:wordMeaning?
                                   { return { kind: "word", gloss, pronunciation, definitions: defs ?? [] } }

ipaString = "/" ipa:$[^/]+ "/" { return [ipa, location()] }

wordMeaning = _ ":" _ def:(text:$(!eol .)* { return [{ partOfSpeech: null, text: [text, location()] }] }) { return def }
            / sensesBlock
sensesBlock = _ "{" __ xs:wordSense|1.., eol| __ "}" { return xs }
wordSense = partOfSpeech:ident "." _ text:(def:$(!eol .)+ { return [def, location()] }) { return { partOfSpeech, text } }


// SOUND CHANGE

soundChangeDefinition = "$" _ source:source _ ">" _ target:target environment:conditionClause? description:soundChangeDescription?
                        { return { kind: "sound-change", source, target, environment, description } }

source = source:(empty / sourcePattern)
         { return { ...source, span: location() } }
target = target:(empty / targetPattern / modifier)
         { return { ...target, span: location() } }

sourcePattern = segments:segment+ { return { kind: "pattern", segments } }
targetPattern = glyphs:ident { return { kind: "phonemes", glyphs: glyphs[0] } }
segment = glyphs:ident { return { kind: "phonemes", glyphs: glyphs[0], span: glyphs[1] } }
        / cat:category { return { kind: "category", ...cat } }
modifier = "[" mods:feature+ "]" { return { kind: "modification", mods } }
empty = "[]" { return { kind: "empty" } }

conditionClause = _ "/" _ env:condition { return env }
condition = as:"#"? before:envPattern? "_" after:envPattern? ae:"#"?
            { return { before: before ?? [], after: after ?? [], anchorStart: as !== null, anchorEnd: ae !== null, span: location() } }
envPattern = envElement|1..|
envElement = "." { return { kind: "syllable-boundary", span: location() } }
           / p:sourcePattern { return { ...p, span: location() } }

soundChangeDescription = _ ":" _ desc:(text:$(!eol .)* { return [text, location()] }) { return desc }

`;

export default grammar;
