use chronlang_parser::ast::{Span, Spanned};
use crate::tag::Tag;

#[derive(Clone, Debug, PartialEq)]
pub struct Word {
    pub gloss: String,
    pub gloss_span: Span,
    pub pronunciation: Vec<String>,
    pub pronunciation_span: Span,
    pub definitions: Vec<Definition>,
    pub tag: Tag,
}

impl Word {
    pub fn new(gloss: &Spanned<String>, prn: &Spanned<Vec<String>>, definitions: &Vec<Definition>, tag: &Tag) -> Self {
        Self {
            gloss: gloss.1.clone(),
            gloss_span: gloss.0.clone(),
            pronunciation: prn.1.clone(),
            pronunciation_span: prn.0.clone(),
            definitions: definitions.clone(),
            tag: tag.clone(),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Definition {
    pub pos: Option<String>,
    pub pos_span: Option<Span>,
    pub definition: String,
    pub definition_span: Span,
}

impl Definition {
    pub fn new(pos: &Option<Spanned<String>>, definition: &Spanned<String>) -> Self {
        Self {
            pos: pos.clone().map(|p| p.1),
            pos_span: pos.clone().map(|p| p.0),
            definition: definition.1.clone(),
            definition_span: definition.0.clone()
        }
    }
}