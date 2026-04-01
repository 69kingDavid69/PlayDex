use crate::types::AudioFormat;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use dirs;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub download_location: String,
    pub preferred_format: AudioFormat,
    pub allow_fallback: bool,
    pub reject_below_320: bool,
    pub parallel_downloads: u8,
    pub retry_count: u8,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            download_location: default_download_location(),
            preferred_format: AudioFormat::FLAC,
            allow_fallback: true,
            reject_below_320: true,
            parallel_downloads: 3,
            retry_count: 2,
        }
    }
}

fn default_download_location() -> String {
    if let Some(music_dir) = dirs::audio_dir() {
        music_dir.join("PlayDex").to_string_lossy().into_owned()
    } else if let Some(home) = dirs::home_dir() {
        home.join("Music").join("PlayDex").to_string_lossy().into_owned()
    } else {
        "~/Music/PlayDex".to_string()
    }
}

pub async fn get_settings() -> Result<Settings> {
    let config_path = config_file_path()?;
    if config_path.exists() {
        let content = tokio::fs::read_to_string(config_path).await?;
        let settings = serde_json::from_str(&content)?;
        Ok(settings)
    } else {
        let settings = Settings::default();
        save_settings(settings.clone()).await?;
        Ok(settings)
    }
}

pub async fn save_settings(settings: Settings) -> Result<()> {
    let config_path = config_file_path()?;
    let config_dir = config_path.parent().unwrap();
    tokio::fs::create_dir_all(config_dir).await?;
    let content = serde_json::to_string_pretty(&settings)?;
    tokio::fs::write(config_path, content).await?;
    Ok(())
}

pub fn config_file_path() -> Result<PathBuf> {
    let config_dir = dirs::config_dir()
        .or_else(|| dirs::home_dir().map(|h| h.join(".config")))
        .unwrap_or_else(|| PathBuf::from("."));
    Ok(config_dir.join("playdex").join("config.json"))
}