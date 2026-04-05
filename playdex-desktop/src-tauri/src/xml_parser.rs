use crate::types::{Playlist, PlaylistSource, Track};
use anyhow::{bail, Result};
use dirs::home_dir;
use plist::Value;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tokio::fs;
use uuid::Uuid;

#[derive(thiserror::Error, Debug)]
pub enum XmlParseError {
    #[error("No se encontró un archivo XML legible de Music/iTunes")]
    LibraryNotFound,
    #[error("El XML seleccionado ya no existe en {0}")]
    CustomLibraryNotFound(String),
    #[error("Se detectó una librería moderna de Music en {0}, pero esta versión de la app necesita un XML exportado. En Music usa File > Library > Export Library y luego pulsa \"Importar XML...\".")]
    MusicLibraryPackageFound(String),
    #[error("El archivo de librería existe, pero no tiene el formato esperado")]
    MalformedLibrary,
}

pub async fn load_playlists_from_xml(custom_path: Option<&Path>) -> Result<Vec<Playlist>> {
    let candidate_paths = candidate_library_paths(custom_path);

    // Si se proporciona una ruta personalizada y no existe, error
    if let Some(custom_path) = custom_path {
        if !custom_path.exists() {
            bail!(XmlParseError::CustomLibraryNotFound(
                custom_path.display().to_string()
            ));
        }
    }

    let path = candidate_paths.iter().find(|p| p.exists());
    let path = match path {
        Some(p) => p,
        None => {
            // Verificar si existe el paquete de Music moderno
            if let Some(package_path) = music_library_package_path() {
                bail!(XmlParseError::MusicLibraryPackageFound(
                    package_path.display().to_string()
                ));
            }
            bail!(XmlParseError::LibraryNotFound);
        }
    };

    let data = fs::read(path).await?;
    let plist =
        Value::from_reader(Cursor::new(data)).map_err(|_| XmlParseError::MalformedLibrary)?;

    let root_dict = plist
        .as_dictionary()
        .ok_or(XmlParseError::MalformedLibrary)?;
    let tracks_dict = root_dict
        .get("Tracks")
        .and_then(Value::as_dictionary)
        .ok_or(XmlParseError::MalformedLibrary)?;
    let playlists_array = root_dict
        .get("Playlists")
        .and_then(Value::as_array)
        .ok_or(XmlParseError::MalformedLibrary)?;

    let mut playlists = Vec::new();
    for playlist_value in playlists_array {
        let playlist_dict = playlist_value
            .as_dictionary()
            .ok_or(XmlParseError::MalformedLibrary)?;

        // Saltar playlist maestra
        if playlist_dict
            .get("Master")
            .and_then(Value::as_boolean)
            .unwrap_or(false)
        {
            continue;
        }

        let name = playlist_dict
            .get("Name")
            .and_then(Value::as_string)
            .ok_or(XmlParseError::MalformedLibrary)?
            .to_string();

        let items: &[plist::Value] = playlist_dict
            .get("Playlist Items")
            .and_then(Value::as_array)
            .map(|vec| vec.as_slice())
            .unwrap_or(&[]);

        let mut tracks = Vec::new();
        for item in items {
            let item_dict = item
                .as_dictionary()
                .ok_or(XmlParseError::MalformedLibrary)?;
            let track_id_value = item_dict
                .get("Track ID")
                .ok_or(XmlParseError::MalformedLibrary)?;

            let track_id = match track_id_value {
                Value::Integer(i) => i.to_string(),
                Value::String(s) => s.clone(),
                _ => continue,
            };

            let track_dict = tracks_dict
                .get(&track_id)
                .and_then(Value::as_dictionary)
                .ok_or(XmlParseError::MalformedLibrary)?;

            let artist = track_dict
                .get("Artist")
                .and_then(Value::as_string)
                .or_else(|| track_dict.get("Album Artist").and_then(Value::as_string))
                .unwrap_or("Unknown Artist")
                .to_string();
            let title = track_dict
                .get("Name")
                .and_then(Value::as_string)
                .unwrap_or("Unknown Title")
                .to_string();
            let album = track_dict
                .get("Album")
                .and_then(Value::as_string)
                .map(String::from);
            let isrc = track_dict
                .get("ISRC")
                .and_then(Value::as_string)
                .map(String::from);
            let duration_milliseconds = track_dict
                .get("Total Time")
                .and_then(|v| {
                    v.as_real()
                        .or_else(|| v.as_unsigned_integer().map(|i| i as f64))
                        .or_else(|| v.as_signed_integer().map(|i| i as f64))
                })
                .unwrap_or(0.0);
            let duration_seconds = if duration_milliseconds > 0.0 {
                Some(duration_milliseconds / 1000.0)
            } else {
                None
            };

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
            continue;
        }

        playlists.push(Playlist {
            id: Uuid::new_v4().to_string(),
            name,
            tracks,
            source: PlaylistSource::XmlLibrary,
        });
    }

    // Ordenar alfabéticamente
    playlists.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(playlists)
}

fn candidate_library_paths(custom_path: Option<&Path>) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Some(custom) = custom_path {
        paths.push(custom.to_path_buf());
    }
    if let Some(home) = home_dir() {
        paths.push(home.join("Music/Music/Music Library.xml"));
        paths.push(home.join("Music/iTunes/iTunes Library.xml"));
    }
    paths
}

fn music_library_package_path() -> Option<PathBuf> {
    home_dir()
        .map(|home| home.join("Music/Music/Music Library.musiclibrary"))
        .filter(|p| p.exists())
}
