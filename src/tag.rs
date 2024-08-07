use chronlang_parser::ast;

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