use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::path::PathBuf;

use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use anyhow::Result;

use crate::types::Playlist;
use crate::settings;
use crate::keyring;

#[derive(Error, Debug)]
pub enum EngineError {
    #[error("Script not found")]
    ScriptNotFound,
    #[error("Stdin unavailable")]
    StdinUnavailable,
    #[error("Process launch failed: {0}")]
    ProcessLaunchFailed(String),
    #[error("IO error: {0}")]
    IoError(String),
    #[error("JSON error: {0}")]
    JsonError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineTrackDescriptor {
    pub artist: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistStats {
    pub completed: u32,
    pub skipped: u32,
    pub errors: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event", content = "data")]
pub enum EngineEvent {
    BridgeReady {
        deemix_available: bool,
        download_ready: bool,
        arl_present: bool,
    },
    Progress {
        track: EngineTrackDescriptor,
        percent: f64,
        speed_kbps: Option<f64>,
        eta_seconds: Option<u64>,
    },
    Completed {
        track: EngineTrackDescriptor,
        file_path: String,
        audio_format: String,
        file_size_mb: Option<f64>,
    },
    Skipped {
        track: EngineTrackDescriptor,
        reason: String,
        existing_file: String,
        existing_playlist: String,
    },
    Error {
        track: Option<EngineTrackDescriptor>,
        error_code: String,
        message: String,
    },
    PlaylistDone {
        playlist: String,
        stats: PlaylistStats,
    },
    BridgeError {
        error_code: String,
        message: String,
    },
}

struct EngineProcessInner {
    process: Option<std::process::Child>,
    stdin: Option<std::process::ChildStdin>,
    stdout_thread: Option<thread::JoinHandle<()>>,
    app: AppHandle,
}

#[derive(Clone)]
pub struct EngineProcess {
    inner: Arc<Mutex<EngineProcessInner>>,
}

impl EngineProcess {
    pub fn new(app: AppHandle) -> Self {
        Self {
            inner: Arc::new(Mutex::new(EngineProcessInner {
                process: None,
                stdin: None,
                stdout_thread: None,
                app,
            })),
        }
    }

    pub fn start(&self) -> Result<(), EngineError> {
        let mut inner = self.inner.lock().unwrap();
        
        if inner.process.is_some() {
            return Ok(());
        }

        // Buscar el script Python
        let script_path = Self::find_script_path()?;
        
        // Configurar variables de entorno
        let settings = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(settings::get_settings())
            .map_err(|e| EngineError::ProcessLaunchFailed(e.to_string()))?;
        
        let arl = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(keyring::get_arl())
            .map_err(|e| EngineError::ProcessLaunchFailed(e.to_string()))?;

        // Crear configuración del engine
        let config_path = settings::config_file_path()
            .map_err(|e| EngineError::ProcessLaunchFailed(e.to_string()))?;
        let config_dir = config_path.parent().unwrap();
        std::fs::create_dir_all(config_dir)
            .map_err(|e| EngineError::ProcessLaunchFailed(e.to_string()))?;

        // Generar config.json para el engine
        let engine_config = serde_json::json!({
            "downloadLocation": settings.download_location,
            "quality": {
                "preferred": match settings.preferred_format {
                    crate::types::AudioFormat::FLAC => "FLAC",
                    crate::types::AudioFormat::MP3_320 => "MP3_320",
                },
                "fallback_chain": match settings.preferred_format {
                    crate::types::AudioFormat::FLAC => vec!["FLAC", "MP3_320"],
                    crate::types::AudioFormat::MP3_320 => vec!["MP3_320"],
                },
                "reject_below": if settings.reject_below_320 { serde_json::Value::String("MP3_320".to_string()) } else { serde_json::Value::Null },
            },
            "parallelDownloads": settings.parallel_downloads,
            "retryCount": settings.retry_count,
        });

        std::fs::write(&config_path, serde_json::to_string_pretty(&engine_config).unwrap())
            .map_err(|e| EngineError::ProcessLaunchFailed(e.to_string()))?;

        // Lanzar proceso Python
        let mut command = Command::new("python3");
        command.arg(&script_path);
        command.env("PYTHONUNBUFFERED", "1");
        command.env("DEEMIX_ITUNES_CONFIG_PATH", config_path);
        command.env("DEEMIX_ITUNES_ARL", arl);
        
        // Añadir vendor al PYTHONPATH
        if let Some(vendor_path) = Self::find_vendor_path() {
            command.env("PYTHONPATH", vendor_path);
        }

        command.stdin(Stdio::piped());
        command.stdout(Stdio::piped());
        command.stderr(Stdio::inherit());

        let mut child = command.spawn()
            .map_err(|e| EngineError::ProcessLaunchFailed(e.to_string()))?;

        let stdin = child.stdin.take()
            .ok_or(EngineError::StdinUnavailable)?;

        let app = inner.app.clone();
        let stdout = child.stdout.take().unwrap();
        
        // Hilo para leer stdout
        let stdout_thread = thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        if line.trim().is_empty() {
                            continue;
                        }
                        match serde_json::from_str::<EngineEvent>(&line) {
                            Ok(event) => {
                                let _ = app.emit("engine-event", event);
                            }
                            Err(e) => {
                                eprintln!("Error parsing engine event: {} - {}", e, line);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Error reading from engine stdout: {}", e);
                        break;
                    }
                }
            }
        });

        inner.process = Some(child);
        inner.stdin = Some(stdin);
        inner.stdout_thread = Some(stdout_thread);

        Ok(())
    }

    pub fn stop(&self) {
        let mut inner = self.inner.lock().unwrap();
        
        if let Some(mut process) = inner.process.take() {
            let _ = process.kill();
            let _ = process.wait();
        }
        
        inner.stdin = None;
        inner.stdout_thread = None;
    }

    pub fn send_command(&self, command: serde_json::Value) -> Result<(), EngineError> {
        let mut inner = self.inner.lock().unwrap();
        
        if let Some(ref mut stdin) = inner.stdin {
            let json = serde_json::to_string(&command)
                .map_err(|e| EngineError::JsonError(e.to_string()))?;
            stdin.write_all(json.as_bytes())
                .map_err(|e| EngineError::IoError(e.to_string()))?;
            stdin.write_all(b"\n")
                .map_err(|e| EngineError::IoError(e.to_string()))?;
            stdin.flush()
                .map_err(|e| EngineError::IoError(e.to_string()))?;
            Ok(())
        } else {
            Err(EngineError::StdinUnavailable)
        }
    }

    fn find_script_path() -> Result<PathBuf, EngineError> {
        // Buscar en recursos empaquetados
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let resource_path = exe_dir.join("resources/engine/deemix_engine.py");
                if resource_path.exists() {
                    return Ok(resource_path);
                }
            }
        }

        // Buscar en desarrollo
        let dev_path = PathBuf::from("src-tauri/resources/engine/deemix_engine.py");
        if dev_path.exists() {
            return Ok(dev_path);
        }

        // Buscar en el proyecto raíz
        let root_path = PathBuf::from("../Resources/python/deemix_engine.py");
        if root_path.exists() {
            return Ok(root_path);
        }

        Err(EngineError::ScriptNotFound)
    }

    fn find_vendor_path() -> Option<String> {
        // Buscar en recursos empaquetados
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let vendor_path = exe_dir.join("resources/engine/vendor");
                if vendor_path.exists() {
                    return Some(vendor_path.to_string_lossy().into_owned());
                }
            }
        }

        // Buscar en desarrollo
        let dev_path = PathBuf::from("src-tauri/resources/engine/vendor");
        if dev_path.exists() {
            return Some(dev_path.to_string_lossy().into_owned());
        }

        // Buscar en el proyecto raíz
        let root_path = PathBuf::from("../Resources/python/vendor");
        if root_path.exists() {
            return Some(root_path.to_string_lossy().into_owned());
        }

        None
    }
}

// Funciones públicas que expone el módulo
pub async fn start_engine(app: AppHandle) -> Result<(), EngineError> {
    let engine = EngineProcess::new(app);
    engine.start()?;
    
    // Guardar la referencia al engine en el estado de la aplicación
    // (esto requeriría un estado compartido, se implementará más tarde)
    Ok(())
}

pub async fn download_playlist(playlist: Playlist) -> Result<(), EngineError> {
    let _command = serde_json::json!({
        "command": "download_playlist",
        "playlist": {
            "name": playlist.name,
            "tracks": playlist.tracks.iter().map(|track| {
                serde_json::json!({
                    "artist": track.artist,
                    "title": track.title,
                    "album": track.album,
                    "isrc": track.isrc,
                    "durationSeconds": track.duration_seconds,
                })
            }).collect::<Vec<_>>(),
        }
    });

    // TODO: Obtener el engine del estado de la aplicación y enviar el comando
    // Por ahora, solo retornamos un error indicando que no está implementado
    Err(EngineError::ProcessLaunchFailed("Engine not available in state".to_string()))
}

pub async fn pause_download() -> Result<(), EngineError> {
    let _command = serde_json::json!({
        "command": "pause"
    });

    // TODO: Enviar comando
    Err(EngineError::ProcessLaunchFailed("Engine not available in state".to_string()))
}

pub async fn resume_download() -> Result<(), EngineError> {
    let _command = serde_json::json!({
        "command": "resume"
    });

    // TODO: Enviar comando
    Err(EngineError::ProcessLaunchFailed("Engine not available in state".to_string()))
}

pub async fn cancel_download() -> Result<(), EngineError> {
    let _command = serde_json::json!({
        "command": "cancel"
    });

    // TODO: Enviar comando
    Err(EngineError::ProcessLaunchFailed("Engine not available in state".to_string()))
}