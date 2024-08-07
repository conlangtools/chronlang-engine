use chronlang_parser::ast::{Span, Spanned};

#[derive(Clone, Debug, PartialEq)]
pub struct Language {
    id: String,
    id_span: Span,
    name: String,
    parent: Option<String>,
    parent_span: Option<Span>
}

impl Language {
    pub fn new(id: &Spanned<String>, name: &Option<Spanned<String>>, parent: &Option<Spanned<String>>) -> Self {
        Self {
            id: id.1.clone(),
            id_span: id.0.clone(),
            name: name.clone().map(|(_, n)| n).unwrap_or(id.1.clone()),
            parent: parent.clone().map(|p| p.1.clone()),
            parent_span: parent.clone().map(|p| p.0.clone())
        }
    }
}