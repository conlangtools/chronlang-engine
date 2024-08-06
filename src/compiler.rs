use chronlang_parser::{ast, parse};
use chronlang_parser::ast::{Definition, Span, Spanned};

use crate::project::*;
use crate::resolver::Resolve;

#[derive(Debug, PartialEq, Clone)]
pub enum CompilationError {
    ParseErrors(Vec<(Span, String)>),
    NoLanguage(Span),
    BadImport(Span, String),
    ImportedNameNotFound(Span, String),
    ImportDependencyNotFound(String),
    NameCollision(Span, Symbol),
}

#[derive(Debug, PartialEq, Clone)]
pub enum CompilationWarning {
    Unimplemented(Span, String),
}

#[derive(Debug, PartialEq)]
pub struct CompilationResult {
    pub ok: bool,
    pub project: Project,
    pub errors: Vec<CompilationError>,
    pub warnings: Vec<CompilationWarning>,
}

struct CompilerState<'a> {
    source_name: &'a str,
    current_language: Option<Spanned<String>>,
    current_time: Spanned<ast::Time>,
    errors: Vec<CompilationError>,
    warnings: Vec<CompilationWarning>,
}

impl<'a> CompilerState<'a> {
    fn new(source_name: &'a str) -> Self {
        Self {
            source_name: source_name.into(),
            current_language: None,
            current_time: (0..0, ast::Time::Instant(0)),
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }
}

fn compile_ast(ast: Vec<(Span, ast::Stmt)>, source_name: &str, resolver: &impl Resolve) -> CompilationResult {
    let mut project = Project::new();
    let mut state = CompilerState::new(source_name);

    for (span, stmt) in ast {
        match stmt {
            ast::Stmt::Milestone { time, language } =>
                compile_milestone(&mut project, &mut state, time, language),
            ast::Stmt::SoundChange { source, target, environment, description, } =>
                compile_sound_change(&mut project, &mut state, span, source, target, environment, description),
            ast::Stmt::Language { id, parent, name } =>
                compile_language(&mut project, &mut state, &span, id, parent, name),
            ast::Stmt::Word { gloss, pronunciation, definitions } =>
                compile_word(&mut project, &mut state, &span, gloss, pronunciation, definitions),
            ast::Stmt::Class { label, encodes, annotates, phonemes } =>
                compile_class(&mut project, &mut state, &span, label, encodes, annotates, phonemes),
            ast::Stmt::Series { label, series } =>
                compile_series(&mut project, &mut state, &span, label, series),
            ast::Stmt::Trait { label, members } =>
                compile_trait(&mut project, &mut state, &span, label, members),
            ast::Stmt::Import { path, names, .. } =>
                compile_import(&mut project, &mut state, resolver, span, path, names),
        }
    }

    CompilationResult {
        ok: state.errors.len() == 0,
        project,
        errors: state.errors,
        warnings: state.warnings,
    }
}

fn compile_milestone(project: &mut Project, state: &mut CompilerState, time: Option<Spanned<ast::Time>>, language: Option<Spanned<String>>) {
    if let Some(time) = time {
        project.milestones.push(match time.1 {
            ast::Time::Instant(t) => t,
            ast::Time::Range(_, t) => t,
        });
        state.current_time = time
    }

    if let Some(language) = language {
        state.current_language = Some(language.clone())
    }
}

fn compile_sound_change(project: &mut Project, state: &mut CompilerState, span: Span, source: Spanned<ast::Source>, target: Spanned<ast::Target>, environment: Option<Spanned<ast::Environment>>, description: Option<Spanned<String>>) {
    match &state.current_language {
        Some(lang) => {
            project.sound_changes.push(SoundChange {
                source_name: state.source_name.into(),
                source,
                target,
                environment,
                description,
                tag: Tag::new(&lang.clone(), &state.current_time),
            })
        }
        _ => state.errors.push(CompilationError::NoLanguage(span)),
    }
}

fn compile_language(project: &mut Project, state: &mut CompilerState, span: &Span, id: Spanned<String>, parent: Option<Spanned<String>>, name: Option<Spanned<String>>) {
    let maybe_clash = project.add_symbol(Symbol {
        name: id.1.clone(),
        loc: Location { source_name: state.source_name.into(), span: span.clone() },
        value: Entity::Language { id: id.clone(), name, parent: parent.clone() },
        dependencies: parent.map(|(_, p)| vec![p]).unwrap_or(vec![]),
    });

    if let Err(clash) = maybe_clash {
        state.errors.push(CompilationError::NameCollision(id.0, clash));
    }
}

fn compile_word(project: &mut Project, state: &mut CompilerState, span: &Span, gloss: Spanned<String>, pronunciation: Spanned<Vec<String>>, definitions: Vec<Definition>) {
    match &state.current_language {
        Some(lang) => {
            let maybe_clash = project.add_symbol(Symbol {
                name: gloss.1.clone(),
                loc: Location { source_name: state.source_name.into(), span: span.clone() },
                value: Entity::Word {
                    gloss: gloss.clone(),
                    pronunciation,
                    definitions,
                    tag: Tag::new(&lang.clone(), &state.current_time),
                },
                dependencies: vec![],
            });

            if let Err(clash) = maybe_clash {
                state.errors.push(CompilationError::NameCollision(gloss.0, clash));
            }
        }
        _ => state.errors.push(CompilationError::NoLanguage(span.clone())),
    }
}

fn compile_class(project: &mut Project, state: &mut CompilerState, span: &Span, label: Spanned<String>, encodes: Vec<Spanned<String>>, annotates: Vec<Spanned<String>>, phonemes: Vec<Spanned<ast::PhonemeDef>>) {
    let phoneme_names = phonemes.iter().map(|(_, p)| p.label.1.clone()).collect::<Vec<_>>();
    let encodes_names = encodes.iter().map(|(_, e)| e.clone()).collect::<Vec<_>>();
    let annotates_names = annotates.iter().map(|(_, e)| e.clone()).collect::<Vec<_>>();

    let maybe_clash = project.add_symbol(Symbol {
        name: label.1.clone(),
        loc: Location { source_name: state.source_name.into(), span: span.clone() },
        value: Entity::Class {
            label: label.clone(),
            encodes,
            annotates,
            phonemes: phoneme_names.clone(),
        },
        dependencies: [phoneme_names, encodes_names, annotates_names].concat(),
    });

    if let Err(clash) = maybe_clash {
        state.errors.push(CompilationError::NameCollision(label.0.clone(), clash));
    }

    let mut clashes = phonemes.iter()
        .flat_map(|(phoneme_span, phoneme)| {
            let symbol = Symbol {
                name: phoneme.label.1.clone(),
                loc: Location { source_name: state.source_name.into(), span: phoneme_span.clone() },
                value: Entity::Phoneme { class: label.clone(), label: phoneme.label.clone(), traits: phoneme.traits.clone() },
                dependencies: vec![label.1.clone()],
            };

            match project.add_symbol(symbol) {
                Ok(_) => vec![],
                Err(clash) => vec![CompilationError::NameCollision(phoneme.label.0.clone(), clash.clone())],
            }
        })
        .collect::<Vec<_>>();

    state.errors.append(&mut clashes);
}

fn compile_series(project: &mut Project, state: &mut CompilerState, span: &Span, label: Spanned<String>, series: Spanned<ast::Series>) {
    let maybe_clash = project.add_symbol(Symbol {
        name: label.1.clone(),
        loc: Location { source_name: state.source_name.into(), span: span.clone() },
        value: Entity::Series {
            label: label.clone(),
            series: series.clone(),
        },
        dependencies: match series.1 {
            ast::Series::Category(_) => vec![/* TODO: resolve category to get list of phonemes */],
            ast::Series::List(ps) => ps.iter().map(|(_, p)| p.clone()).collect::<Vec<_>>(),
        },
    });

    if let Err(clash) = maybe_clash {
        state.errors.push(CompilationError::NameCollision(label.0, clash));
    }
}

fn compile_trait(project: &mut Project, state: &mut CompilerState, span: &Span, label: Spanned<String>, members: Vec<Spanned<ast::TraitMember>>) {
    let (label_span, label_name) = label;

    let maybe_clash = project.add_symbol(Symbol {
        name: label_name.clone(),
        loc: Location { source_name: state.source_name.into(), span: span.clone() },
        value: Entity::Trait {
            label: (label_span.clone(), label_name.clone()),
            members: members.iter().map(|(_, m)| m.clone()).collect::<Vec<_>>(),
        },
        dependencies: members.iter().map(|member| member.1.labels[0].clone().1).collect::<Vec<_>>(),
    });

    if let Err(clash) = maybe_clash {
        state.errors.push(CompilationError::NameCollision(label_span.clone(), clash));
    }

    let mut clashes = members.iter()
        .flat_map(|(member_span, member)| {
            let symbol = Symbol {
                name: member.labels[0].1.clone(),
                loc: Location { source_name: state.source_name.into(), span: member_span.clone() },
                value: Entity::TraitMember {
                    label: member.labels[0].clone(),
                    aliases: member.labels[1..].to_vec(),
                    default: member.default,
                    notation: member.notation.clone(),
                },
                dependencies: vec![label_name.clone()],
            };

            match project.add_symbol(symbol) {
                Ok(_) => vec![],
                Err(clash) => vec![CompilationError::NameCollision(member.labels[0].0.clone(), clash.clone())],
            }
        })
        .collect::<Vec<_>>();

    state.errors.append(&mut clashes);
}

fn compile_import<'a>(project: &mut Project, state: &'a mut CompilerState, resolver: &impl Resolve, span: Span, path: Vec<Spanned<String>>, names: Vec<Spanned<String>>) {
    let seg_vec = path
        .iter()
        .map(|(_, seg)| seg.as_str())
        .collect::<Vec<_>>();
    let path = &seg_vec[..];
    let import_source = resolver.resolve(path);
    match import_source {
        Ok((source, import_source_name)) => {
            let res = compile(source.as_str(), &import_source_name, resolver);
            state.errors.append(&mut res.errors.clone());
            state.warnings.append(&mut res.warnings.clone());

            names
                .into_iter()
                .for_each(|(span, name)| {
                    let res = if name == "*" {
                        project.import_all_from(&res.project)
                    } else {
                        project.import(&[name.as_str()], &res.project)
                    };

                    if let Err(errs) = res {
                        state.errors.append(&mut errs.iter().map(|e| match e {
                            ImportError::NoSuchSymbol(_) => CompilationError::ImportedNameNotFound(span.clone(), name.clone()),
                            ImportError::FailedDependency(dep) => CompilationError::ImportDependencyNotFound(dep.clone()),
                            ImportError::NameCollision(clash) => CompilationError::NameCollision(span.clone(), clash.clone()),
                        }).collect());
                    }
                })
        }
        Err(e) => state.errors.push(CompilationError::BadImport(span, e.to_string()))
    }
}

pub fn compile(source: &str, source_name: &str, resolver: &impl Resolve) -> CompilationResult {
    match parse(source) {
        Ok(ast) => compile_ast(ast, source_name, resolver),
        Err(errs) => CompilationResult {
            ok: false,
            project: Project::new(),
            warnings: Vec::new(),
            errors: vec![
                CompilationError::ParseErrors(
                    errs.iter().map(|e| (e.span(), e.to_string())).collect(),
                ),
            ],
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use crate::resolver::MockResolver;

    use super::*;

    #[test]
    fn it_works() {
        let resolver = MockResolver::new(HashMap::from([
            ("@core/ipa".into(), "
            trait Manner { stop, flap | tap, fricative, approximant }
            trait Place { bilabial, alveolar, palatal, velar }
            trait Voice { voiced, unvoiced }

            class C encodes (Voice Place Manner) {
                p = voiceless bilabial stop,
                b = voiced bilabial stop,
            }".into()),
        ]));

        let res = compile(
            "
            import * from @core/ipa
            
            series F = { i, e, ε, æ }

            class X encodes (Place Manner) {
                ℂ = velar trill,
                ℤ = labiodental lateral_fricative,
            }

            lang OEng : Old English
            lang AmEng < OEng : American English
            lang RP < OEng : Received Pronunciation
            
            @ 1000, OEng
            
            - water /ˈwæ.ter/ {
                noun. liquid that forms the seas, lakes, rivers, and rain
                verb. pour or sprinkle water over a plant or area
            }
            
            @ 1940, AmEng
            
            $ [C+alveolar+stop] > [+flap] / V_V : Alveolar stops lenite to flaps intervocallically
            ",
            "demo",
            &resolver,
        );

        assert!(res.ok);
        assert_eq!(res.errors, vec![]);
        assert_eq!(res.warnings, vec![]);
    }

    #[test]
    fn it_raises_name_collision_errors() {
        let resolver = MockResolver::new(HashMap::from([
            ("consonants".into(), "
            trait Manner { stop, flap | tap, fricative, approximant }
            trait Place { bilabial, alveolar, palatal, velar }
            trait Voice { voiced, unvoiced }

            class C encodes (Voice Place Manner) {
                p = voiceless bilabial stop,
                b = voiced bilabial stop,
            }".into()),
        ]));

        let res = compile("
            import (C) from consonants

            series C = { p, b }

            class B encodes (Voice Place Manner) {
                b = voiceless bilabial stop
            }

            lang B: b-lang
        ", "demo", &resolver);

        let expected_errors = vec![
            CompilationError::NameCollision(
                60..61,
                Symbol {
                    name: "C".into(),
                    loc: Location { source_name: "consonants".into(), span: 192..331 },
                    value: Entity::Class {
                        label: (198..199, "C".into()),
                        encodes: vec![
                            (209..214, "Voice".into()),
                            (215..220, "Place".into()),
                            (221..227, "Manner".into()),
                        ],
                        annotates: vec![],
                        phonemes: vec!["p".into(), "b".into()],
                    },
                    dependencies: vec!["p".into(), "b".into(), "Voice".into(), "Place".into(), "Manner".into()],
                },
            ),
            CompilationError::NameCollision(
                141..142,
                Symbol {
                    name: "b".into(),
                    loc: Location { source_name: "consonants".into(), span: 292..316 },
                    value: Entity::Phoneme {
                        class: (198..199, "C".into()),
                        label: (292..293, "b".into()),
                        traits: vec![
                            (296..302, "voiced".into()),
                            (303..311, "bilabial".into()),
                            (312..316, "stop".into()),
                        ],
                    },
                    dependencies: vec!["C".into()],
                },
            ),
            CompilationError::NameCollision(
                201..202,
                Symbol {
                    name: "B".into(),
                    loc: Location { source_name: "demo".into(), span: 86..182 },
                    value: Entity::Class {
                        label: (92..93, "B".into()),
                        encodes: vec![
                            (103..108, "Voice".into()),
                            (109..114, "Place".into()),
                            (115..121, "Manner".into()),
                        ],
                        annotates: vec![],
                        phonemes: vec!["b".into()],
                    },
                    dependencies: vec!["b".into(), "Voice".into(), "Place".into(), "Manner".into()],
                },
            ),
        ];

        // println!("\n\n{:#?}\n\n", res.project.symbols.keys().collect::<Vec<_>>());

        // println!("\n\n{:#?}\n\n", res);

        // println!("Expected:\n{:#?}\n\n", expected_errors);
        // println!("Actual:\n{:#?}\n\n", res.errors);

        assert_eq!(res.errors, expected_errors);
    }
}
