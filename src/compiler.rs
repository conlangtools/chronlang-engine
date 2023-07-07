use crate::resolver::Resolve;
use crate::project::*;
use chronlang_parser::{ast, parse};

#[derive(Debug, PartialEq, Clone)]
pub enum CompilationError {
    ParseErrors(Vec<(ast::Span, String)>),
    NoLanguage(ast::Span),
    BadImport(ast::Span, String),
    ImportedNameNotFound(ast::Span, String),
    ImportDependencyNotFound(String),
    NameCollision(ast::Span, Symbol),
}

#[derive(Debug, PartialEq, Clone)]
pub enum CompilationWarning {
    Unimplemented(ast::Span, String),
}

#[derive(Debug, PartialEq)]
pub struct CompilationResult {
    pub ok: bool,
    pub project: Project,
    pub errors: Vec<CompilationError>,
    pub warnings: Vec<CompilationWarning>,
}

fn compile_ast(ast: Vec<(ast::Span, ast::Stmt)>, source_name: &str, resolver: &impl Resolve) -> CompilationResult {
    let mut project = Project::new();
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    let mut current_language: Option<ast::Spanned<String>> = None;
    let mut current_time: ast::Spanned<ast::Time> = (0..0, ast::Time::Instant(0));

    for (span, stmt) in ast {
        // println!("{:?}", stmt);

        match stmt {
            ast::Stmt::Milestone { time, language } => {
                if let Some(time) = time {
                    current_time = time.clone();
                    project.milestones.push(match time.1 {
                        ast::Time::Instant(t) => t,
                        ast::Time::Range(_, t) => t,
                    })
                }
                if let Some(language) = language {
                    current_language = Some(language.clone());
                }
            }
            ast::Stmt::SoundChange {
                source,
                target,
                environment,
                description,
            } => match &current_language {
                Some(lang) => {
                    project.sound_changes.push(SoundChange {
                        source_name: source_name.into(),
                        source,
                        target,
                        environment,
                        description,
                        tag: Tag::new(&lang.clone(), &current_time),
                    })
                },
                _ => errors.push(CompilationError::NoLanguage(span)),
            }
            ast::Stmt::Language { id, parent, name } => {
                let maybe_clash = project.add_symbol(Symbol {
                    name: id.1.clone(),
                    loc: Location { source_name: source_name.into(), span },
                    value: Entity::Language { id: id.clone(), name, parent: parent.clone() },
                    dependencies: parent.map(|(_, p)| vec![p]).unwrap_or(vec![]),
                });
                
                if let Err(clash) = maybe_clash {
                    errors.push(CompilationError::NameCollision(id.0, clash));
                }
            }
            ast::Stmt::Word {
                gloss,
                pronunciation,
                definitions,
            } => match &current_language {
                Some(lang) => {
                    let maybe_clash = project.add_symbol(Symbol {
                        name: gloss.1.clone(),
                        loc: Location { source_name: source_name.into(), span },
                        value: Entity::Word {
                            gloss: gloss.clone(),
                            pronunciation,
                            definitions,
                            tag: Tag::new(&lang.clone(), &current_time)
                        },
                        dependencies: vec![],
                    });
                
                    if let Err(clash) = maybe_clash {
                        errors.push(CompilationError::NameCollision(gloss.0, clash));
                    }
                },
                _ => errors.push(CompilationError::NoLanguage(span)),
            },
            ast::Stmt::Class {
                label,
                encodes,
                annotates,
                phonemes,
            } => {
                let phoneme_names = phonemes.iter().map(|p| p.label.1.clone()).collect::<Vec<_>>();
                let encodes_names = encodes.iter().map(|e| e.1.clone()).collect::<Vec<_>>();
                let annotates_names = annotates.iter().map(|e| e.1.clone()).collect::<Vec<_>>();

                let maybe_clash = project.add_symbol(Symbol {
                    name: label.1.clone(),
                    loc: Location { source_name: source_name.into(), span: span.clone() },
                    value: Entity::Class {
                        label: label.clone(),
                        encodes,
                        annotates,
                        phonemes: phoneme_names.clone(),
                    },
                    dependencies: [phoneme_names, encodes_names, annotates_names].concat(),
                });
                
                if let Err(clash) = maybe_clash {
                    errors.push(CompilationError::NameCollision(label.0.clone(), clash));
                }

                let mut clashes = phonemes.iter()
                    .flat_map(|p| {
                        let symbol = Symbol {
                            name: p.label.1.clone(),
                            loc: Location { source_name: source_name.into(), span: span.clone() },
                            value: Entity::Phoneme { class: label.clone(), label: p.label.clone(), traits: p.traits.clone() },
                            dependencies: vec![label.1.clone()],
                        };

                        match project.add_symbol(symbol) {
                            Ok(_) => vec![],
                            Err(clash) => vec![CompilationError::NameCollision(p.label.0.clone(), clash.clone())],
                        }
                    })
                    .collect::<Vec<_>>();

                errors.append(&mut clashes);
            },
            ast::Stmt::Series {
                label,
                series
            } => {
                let maybe_clash = project.add_symbol(Symbol {
                    name: label.1.clone(),
                    loc: Location { source_name: source_name.into(), span: span.clone() },
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
                    errors.push(CompilationError::NameCollision(label.0, clash));
                }
            },
            ast::Stmt::Trait {
                label,
                members
            } => {
                let maybe_clash = project.add_symbol(Symbol {
                    name: label.1.clone(),
                    loc: Location { source_name: source_name.into(), span: span.clone() },
                    value: Entity::Trait {
                        label: label.clone(),
                        members: members.clone(),
                    },
                    dependencies: members.iter().map(|member| member.labels[0].1.clone()).collect::<Vec<_>>(),
                });
                
                if let Err(clash) = maybe_clash {
                    errors.push(CompilationError::NameCollision(label.0, clash));
                }

                let mut clashes = members.iter()
                    .flat_map(|m| {
                        let symbol = Symbol {
                            name: m.labels[0].1.clone(),
                            loc: Location { source_name: source_name.into(), span: span.clone()},
                            value: Entity::TraitMember {
                                label: m.labels[0].clone(),
                                aliases: m.labels[1..].to_vec(),
                                default: m.default,
                                notation: m.notation.clone(),
                            },
                            dependencies: vec![label.1.clone()],
                        };

                        match project.add_symbol(symbol) {
                            Ok(_) => vec![],
                            Err(clash) => vec![CompilationError::NameCollision(m.labels[0].0.clone(), clash.clone())],
                        }
                    })
                    .collect::<Vec<_>>();

                errors.append(&mut clashes);
            },
            ast::Stmt::Import { path, names, .. } => {
                let seg_vec = path
                    .iter()
                    .map(|(_, seg)| seg.as_str())
                    .collect::<Vec<_>>();
                let path = &seg_vec[..];
                let import_source = resolver.resolve(path);
                match import_source {
                    Ok((source, import_source_name)) => {
                        let res = compile(source.as_str(), &import_source_name, resolver);
                        errors.append(&mut res.errors.clone());
                        warnings.append(&mut res.warnings.clone());

                        // println!("\n\n{:#?}\n\n", res.project.symbols.iter().sorted_by_key(|(key, _)| key.to_owned()).map(|(key, value)| (key, value.dependencies.clone())).collect_vec());

                        names
                            .into_iter()
                            .for_each(|(span, name)| {
                                if name == "*" {
                                    let res = project.import_all_from(&res.project);
                                    
                                    if let Err(errs) = res {
                                        errors.append(&mut errs.iter().map(|e| match e {
                                            ImportError::NoSuchSymbol(_) => CompilationError::ImportedNameNotFound(span.clone(), name.clone()),
                                            ImportError::FailedDependency(dep) => CompilationError::ImportDependencyNotFound(dep.clone()),
                                            ImportError::NameCollision(clash) => CompilationError::NameCollision(span.clone(), clash.clone()),
                                        }).collect());
                                    }
                                }
                                else {
                                    let res = project.import(&[name.as_str()], &res.project);

                                    if let Err(errs) = res {
                                        errors.append(&mut errs.iter().map(|e| match e {
                                            ImportError::NoSuchSymbol(_) => CompilationError::ImportedNameNotFound(span.clone(), name.clone()),
                                            ImportError::FailedDependency(dep) => CompilationError::ImportDependencyNotFound(dep.clone()),
                                            ImportError::NameCollision(clash) => CompilationError::NameCollision(span.clone(), clash.clone()),
                                        }).collect());
                                    }
                                }
                            })
                    },
                    Err(e) => errors.push(CompilationError::BadImport(span, e.to_string()))
                }
            },
        }
    }

    CompilationResult {
        ok: errors.len() == 0,
        project,
        errors,
        warnings,
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
                }
            ),
            CompilationError::NameCollision(
                141..142,
                Symbol {
                    name: "b".into(),
                    loc: Location { source_name: "consonants".into(), span: 192..331 },
                    value: Entity::Phoneme {
                        class:  (198..199, "C".into()),
                        label: (292..293, "b".into()),
                        traits: vec![
                            (296..302, "voiced".into()),
                            (303..311, "bilabial".into()),
                            (312..316, "stop".into()),
                        ],
                    },
                    dependencies: vec!["C".into()],
                }
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
                }
            ),
        ];

        // println!("\n\n{:#?}\n\n", res.project.symbols.keys().collect::<Vec<_>>());

        // println!("\n\n{:#?}\n\n", res);

        // println!("Expected:\n{:#?}\n\n", expected_errors);
        // println!("Actual:\n{:#?}\n\n", res.errors);
        
        assert_eq!(res.errors, expected_errors);
    }
}
