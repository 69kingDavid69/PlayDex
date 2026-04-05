use crate::types::{Playlist, PlaylistSource, Track};
use anyhow::{bail, Result};
use std::path::Path;
use tokio::fs;
use uuid::Uuid;

#[derive(thiserror::Error, Debug)]
pub enum CsvParseError {
    #[error("El archivo CSV no se encontró en {0}")]
    FileNotFound(String),
    #[error("El archivo CSV está vacío o no contiene filas de datos")]
    EmptyFile,
    #[error("El CSV debe tener columnas identificables de título y artista")]
    MissingRequiredColumns,
}

pub async fn load_playlist_from_csv(path: &Path) -> Result<Playlist> {
    if !path.exists() {
        bail!(CsvParseError::FileNotFound(path.display().to_string()));
    }

    let data = fs::read(path).await?;
    let mut rdr = csv::Reader::from_reader(data.as_slice());

    let headers = rdr.headers()?;
    if headers.is_empty() {
        bail!(CsvParseError::EmptyFile);
    }

    // Normalizar headers: quitar comillas y espacios, convertir a minúsculas
    let normalized_headers: Vec<String> = headers
        .iter()
        .map(|h| unquote(h).to_lowercase().trim().to_string())
        .collect();

    // Encontrar índices de columnas requeridas
    let title_index = find_column_index(&normalized_headers, &["title", "name", "song", "track"])
        .ok_or(CsvParseError::MissingRequiredColumns)?;
    let artist_index = find_column_index(&normalized_headers, &["artist"])
        .ok_or(CsvParseError::MissingRequiredColumns)?;

    let album_index = find_column_index(&normalized_headers, &["album"]);
    let isrc_index = find_column_index(&normalized_headers, &["isrc"]);
    let duration_index = find_column_index(&normalized_headers, &["duration"]);

    let mut tracks = Vec::new();
    for result in rdr.records() {
        let record = result?;
        let cols: Vec<&str> = record.iter().collect();

        // Asegurar que tenemos suficientes columnas
        if cols.len() <= title_index.max(artist_index) {
            continue;
        }

        let title = cols[title_index].trim().to_string();
        let raw_artist = cols[artist_index].trim();
        let artist = first_artist(raw_artist);

        if title.is_empty() || artist.is_empty() {
            continue;
        }

        let album = album_index.and_then(|idx| {
            cols.get(idx)
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .map(String::from)
        });
        let isrc = isrc_index.and_then(|idx| {
            cols.get(idx)
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .map(String::from)
        });
        let duration_seconds = duration_index.and_then(|idx| {
            cols.get(idx).and_then(|s| {
                let s = s.trim();
                if s.is_empty() {
                    return None;
                }
                match s.parse::<f64>() {
                    Ok(ms) if ms > 0.0 => {
                        // Spotify exports duration in ms; values > 3600 are ms, smaller are already seconds
                        Some(if ms > 3600.0 { ms / 1000.0 } else { ms })
                    }
                    _ => None,
                }
            })
        });

        tracks.push(Track {
            id: Uuid::new_v4().to_string(),
            artist,
            title,
            album,
            isrc,
            duration_seconds,
        });
    }

    if tracks.is_empty() {
        bail!(CsvParseError::EmptyFile);
    }

    let playlist_name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Playlist CSV")
        .to_string();

    Ok(Playlist {
        id: Uuid::new_v4().to_string(),
        name: playlist_name,
        tracks,
        source: PlaylistSource::CsvLibrary,
    })
}

fn unquote(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.starts_with('"') && trimmed.ends_with('"') {
        trimmed[1..trimmed.len() - 1].to_string()
    } else {
        trimmed.to_string()
    }
}

fn first_artist(value: &str) -> String {
    // Solo dividir por coma si parece una lista de artistas
    // Heurística: Spotify multi-artist fields contain short tokens separated by ", "
    let parts: Vec<&str> = value.split(", ").collect();
    if parts.len() > 1 {
        // Si hay más de una parte, asumir que es lista de artistas
        parts[0].trim().to_string()
    } else {
        value.trim().to_string()
    }
}

fn find_column_index(headers: &[String], candidates: &[&str]) -> Option<usize> {
    let metadata_keywords = ["uri", "url", "id", "image"];
    headers
        .iter()
        .enumerate()
        .find(|(_, header)| {
            // Saltar columnas que son metadata
            let is_metadata = metadata_keywords.iter().any(|kw| header.contains(kw));
            if is_metadata {
                return false;
            }
            candidates
                .iter()
                .any(|candidate| header.contains(candidate))
        })
        .map(|(idx, _)| idx)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio;

    #[tokio::test]
    async fn test_load_csv() {
        let path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("test.csv");
        let result = load_playlist_from_csv(&path).await;
        assert!(result.is_ok());
        let playlist = result.unwrap();
        assert_eq!(playlist.tracks.len(), 3);
        assert_eq!(playlist.tracks[0].artist, "The Weeknd");
        assert_eq!(playlist.tracks[0].title, "Blinding Lights");
        assert_eq!(playlist.tracks[0].album.as_deref(), Some("After Hours"));
        assert_eq!(playlist.tracks[0].isrc.as_deref(), Some("USUG11904161"));
        // duration en segundos: 200040 ms > 3600, dividir entre 1000 = 200.04
        assert!(playlist.tracks[0].duration_seconds.unwrap() - 200.04 < 0.001);
    }
}
