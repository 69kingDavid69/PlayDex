use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AudioFormat {
    FLAC,
    MP3_320,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlaylistSource {
    XmlLibrary,
    CsvLibrary,
    MusicKit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub artist: String,
    pub title: String,
    pub album: Option<String>,
    pub isrc: Option<String>,
    pub duration_seconds: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub tracks: Vec<Track>,
    pub source: PlaylistSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DownloadState {
    Pending,
    Downloading,
    Completed,
    Skipped,
    Error,
    Paused,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadJob {
    pub id: String,
    pub playlist_name: String,
    pub track: Track,
    pub status: DownloadState,
    pub audio_format: Option<AudioFormat>,
    pub progress_percent: f64,
    pub speed_kbps: Option<f64>,
    pub eta_seconds: Option<u64>,
    pub file_path: Option<String>,
    pub file_size_mb: Option<f64>,
    pub message: Option<String>,
    pub existing_playlist: Option<String>,
}
