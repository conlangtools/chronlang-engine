use std::{collections::HashMap, path::Path, fs};

#[derive(Debug, PartialEq, Clone)]
pub enum ResolutionError {
    InvalidPathForResolver(String),
    PathNotFound(String),
}

impl ToString for ResolutionError {
    fn to_string(&self) -> String {
        match self {
            ResolutionError::InvalidPathForResolver(reason) => format!("{reason}. Try using a different resolver."),
            ResolutionError::PathNotFound(path) => format!("Failed to resolve path `{path}`."),
        }
    }
}

pub trait Resolve {
    fn resolve(&self, path: &[&str]) -> Result<(String, String), ResolutionError>;
}

#[derive(Debug, PartialEq)]
pub struct FileSystemResolver<'a> {
    base_path: &'a Path,
    cache: HashMap<&'a str, String>,
}

impl FileSystemResolver<'_> {
    pub fn new(base_path: &Path) -> FileSystemResolver<'_> {
        FileSystemResolver { base_path, cache: HashMap::new() }
    }
}

impl Resolve for FileSystemResolver<'_> {
    fn resolve(&self, path: &[&str]) -> Result<(String, String), ResolutionError> {
        match path.get(0) {
            Some(segment) if segment.starts_with('@') => {
                return Err(ResolutionError::InvalidPathForResolver("FileSystemResolver cannot resolve remote imports.".into()))
            },
            _ => {}
        }

        let mut dir = self.base_path.join(path.join("/"));
        dir.set_extension("lang");
        let file_name = dir.to_str().unwrap();

        if let Some(value) = self.cache.get(file_name) {
            return Ok((value.clone(), file_name.to_string()))
        }

        let file = fs::read_to_string(dir.clone());
        match file {
            Ok(contents) => Ok((contents, file_name.to_string())),
            _ => Err(ResolutionError::PathNotFound(file_name.to_string())),
        }
    }
}

#[derive(Debug, PartialEq)]
pub struct MockResolver {
    sources: HashMap<String, String>,
}

impl MockResolver {
    pub fn new(sources: HashMap<String, String>) -> MockResolver {
        MockResolver { sources }
    }
}

impl Resolve for MockResolver {
    fn resolve(&self, path: &[&str]) -> Result<(String, String), ResolutionError> {
        let path = path.join("/");
        match self.sources.get(&path) {
            Some(source) => Ok((source.clone(), path)),
            None => Err(ResolutionError::PathNotFound(path)),
        }
    }
}


#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn file_system_resolver_resolves_an_existing_path() {
        let base_path = Path::new("./");
        let resolver = FileSystemResolver::new(base_path);
        
        assert!(resolver.resolve(&["demo"]).is_ok());
    }

    #[test]
    fn file_system_resolver_rejects_an_invalid_path() {
        let base_path = Path::new("./");
        let resolver = FileSystemResolver::new(base_path);

        assert_eq!(
            resolver.resolve(&["invalid"]),
            Err(ResolutionError::PathNotFound("./invalid.lang".into())),
        );

    }
}
