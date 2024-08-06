use std::collections::HashMap;

use chronlang_parser::ast::{self, TraitMember};

#[derive(Clone, Debug, PartialEq)]
pub struct Location {
    pub source_name: String,
    pub span: ast::Span,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Symbol {
    pub name: String,
    pub loc: Location,
    pub value: Entity,
    pub dependencies: Vec<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Entity {
    Language {
        id: ast::Spanned<String>,
        name: Option<ast::Spanned<String>>,
        parent: Option<ast::Spanned<String>>,
    },
    Word {
        gloss: ast::Spanned<String>,
        pronunciation: ast::Spanned<Vec<String>>,
        definitions: Vec<ast::Definition>,
        tag: Tag,
    },
    Class {
        label: ast::Spanned<String>,
        encodes: Vec<ast::Spanned<String>>,
        annotates: Vec<ast::Spanned<String>>,
        phonemes: Vec<String>,
    },
    Phoneme {
        class: ast::Spanned<String>,
        label: ast::Spanned<String>,
        traits: Vec<ast::Spanned<String>>,
    },
    Series {
        label: ast::Spanned<String>,
        series: ast::Spanned<ast::Series>,
    },
    Trait {
        label: ast::Spanned<String>,
        members: Vec<TraitMember>,
    },
    TraitMember {
        label: ast::Spanned<String>,
        aliases: Vec<ast::Spanned<String>>,
        default: bool,
        notation: Option<ast::Spanned<String>>,
    },
}

#[derive(Debug, PartialEq)]
pub enum ImportError {
    NoSuchSymbol(String),
    FailedDependency(String),
    NameCollision(Symbol),
}

#[derive(Debug, PartialEq)]
pub struct Project {
    pub milestones: Vec<i64>,
    pub symbols: HashMap<String, Symbol>,
    pub sound_changes: Vec<SoundChange>,
}

impl Project {
    pub fn new() -> Self {
        Self {
            symbols: HashMap::new(),
            milestones: Vec::new(),
            sound_changes: Vec::new(),
        }
    }

    pub fn add_symbol(&mut self, symbol: Symbol) -> Result<(), Symbol> {
        let id = symbol.name.clone();
        match self.symbols.get(&id) {
            Some(clash) => Err(clash.clone()),
            _ => {
                self.symbols.insert(id, symbol);
                Ok(())
            }
        }
    }

    pub fn add_all_symbols(&mut self, symbols: impl Iterator<Item=Symbol>) -> Result<(), Vec<Symbol>> {
        let clashes = symbols
            .flat_map(|sym| match self.add_symbol(sym) {
                Ok(_) => vec![],
                Err(symbol) => vec![symbol]
            })
            .collect::<Vec<_>>();

        if clashes.is_empty() {
            Ok(())
        } else {
            Err(clashes)
        }
    }

    pub fn import(&mut self, names: &[&str], other: &Self) -> Result<(), Vec<ImportError>> {
        let mut imports = HashMap::new();
        let mut errors = Vec::new();
        let mut deps = Vec::new();

        names.iter().for_each(|name| match other.symbols.get(&name.to_string()) {
            Some(_) => deps.push(name.to_string()),
            None => errors.push(ImportError::NoSuchSymbol(name.to_string())),
        });

        while deps.len() > 0 {
            let current = deps.pop().unwrap();
            if imports.contains_key(&current) { continue; }
            match other.symbols.get(&current) {
                Some(symbol) => {
                    imports.insert(current.to_string(), symbol.clone());
                    // println!("Adding deps {:?} to search", symbol.dependencies);
                    deps.append(&mut symbol.dependencies.clone());
                    // println!("Will import: {:?}", imports.keys().collect::<Vec<_>>());
                    // println!("Left to search: {:?}", deps);
                }
                None => errors.push(ImportError::FailedDependency(current.to_string())),
            }
        }

        // println!("\n\nImporting {:?}, depends on {:?}\n\n", name, imports.keys().collect::<Vec<_>>());

        let maybe_clashes = self.add_all_symbols(imports.values().map(|s| s.clone()));
        if let Err(clashes) = maybe_clashes {
            errors.append(&mut clashes.iter().map(|symbol| ImportError::NameCollision(symbol.clone())).collect())
        }

        if errors.len() > 0 {
            Err(errors)
        } else {
            Ok(())
        }
    }

    pub fn import_all_from(&mut self, other: &Project) -> Result<(), Vec<ImportError>> {
        self.import(other.symbols.keys().map(|k| k.as_str()).collect::<Vec<_>>().as_slice(), other)
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Tag {
    pub language: String,
    pub lang_set_span: ast::Span,
    pub time: ast::Time,
    pub time_set_span: ast::Span,
}

impl Tag {
    pub fn new(lang: &ast::Spanned<String>, time: &ast::Spanned<ast::Time>) -> Self {
        Self {
            language: lang.1.clone(),
            lang_set_span: lang.0.clone(),
            time: time.1.clone(),
            time_set_span: time.0.clone(),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct SoundChange {
    pub source_name: String,
    pub source: ast::Spanned<ast::Source>,
    pub target: ast::Spanned<ast::Target>,
    pub environment: Option<ast::Spanned<ast::Environment>>,
    pub description: Option<ast::Spanned<String>>,
    pub tag: Tag,
}
