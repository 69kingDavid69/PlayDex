use std::ffi::OsString;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use thiserror::Error;

use crate::keyring;
use crate::settings;
use crate::types::Playlist;

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

#[derive(Debug, Clone)]
struct PythonCandidate {
    label: &'static str,
    program: OsString,
    args: Vec<OsString>,
    home: Option<PathBuf>,
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
        let script_path = Self::find_script_path(&inner.app)?;

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

        std::fs::write(
            &config_path,
            serde_json::to_string_pretty(&engine_config).unwrap(),
        )
        .map_err(|e| EngineError::ProcessLaunchFailed(e.to_string()))?;

        let mut child = Self::spawn_python_process(&inner.app, &script_path, &config_path, &arl)?;

        let stdin = child.stdin.take().ok_or(EngineError::StdinUnavailable)?;

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
            stdin
                .write_all(json.as_bytes())
                .map_err(|e| EngineError::IoError(e.to_string()))?;
            stdin
                .write_all(b"\n")
                .map_err(|e| EngineError::IoError(e.to_string()))?;
            stdin
                .flush()
                .map_err(|e| EngineError::IoError(e.to_string()))?;
            Ok(())
        } else {
            Err(EngineError::StdinUnavailable)
        }
    }

    fn find_script_path(app: &AppHandle) -> Result<PathBuf, EngineError> {
        use tauri::Manager;
        
        if let Ok(resource_dir) = app.path().resource_dir() {
            let resource_path = resource_dir.join("resources/engine/deemix_engine.py");
            if resource_path.exists() {
                return Ok(resource_path);
            }
            let alt_path = resource_dir.join("engine/deemix_engine.py");
            if alt_path.exists() {
                return Ok(alt_path);
            }
        }

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

    fn spawn_python_process(
        app: &AppHandle,
        script_path: &Path,
        config_path: &Path,
        arl: &str,
    ) -> Result<std::process::Child, EngineError> {
        let vendor_path = Self::find_vendor_path(app);
        let python_path = vendor_path
            .as_deref()
            .map(Self::build_python_path)
            .transpose()?;
        let mut launch_errors = Vec::new();

        for candidate in Self::python_candidates(script_path) {
            let mut command = Command::new(&candidate.program);

            for arg in &candidate.args {
                command.arg(arg);
            }

            command.arg(script_path);
            command.env("PYTHONUNBUFFERED", "1");
            command.env("PYTHONDONTWRITEBYTECODE", "1");
            command.env("DEEMIX_ITUNES_CONFIG_PATH", config_path);
            command.env("DEEMIX_ITUNES_ARL", arl);

            if let Some(home) = &candidate.home {
                command.env("PYTHONHOME", home);
            }

            if let Some(python_path) = &python_path {
                command.env("PYTHONPATH", python_path);
            }

            command.stdin(Stdio::piped());
            command.stdout(Stdio::piped());
            command.stderr(Stdio::inherit());

            match command.spawn() {
                Ok(child) => return Ok(child),
                Err(error) => {
                    launch_errors.push(format!("{} ({}): {}", candidate.label, candidate.program.to_string_lossy(), error));
                }
            }
        }

        Err(EngineError::ProcessLaunchFailed(format!(
            "No Python runtime available for PlayDex ({})",
            launch_errors.join(" | ")
        )))
    }

    fn python_candidates(script_path: &Path) -> Vec<PythonCandidate> {
        let mut candidates = Vec::new();

        #[cfg(not(target_os = "windows"))]
        let _ = script_path;

        #[cfg(target_os = "windows")]
        if let Some(bundled_python) = Self::find_bundled_python(script_path) {
            candidates.push(PythonCandidate {
                label: "bundled python",
                home: bundled_python.parent().map(Path::to_path_buf),
                program: bundled_python.into_os_string(),
                args: Vec::new(),
            });
        }

        #[cfg(target_os = "windows")]
        {
            candidates.push(PythonCandidate {
                label: "py -3",
                program: OsString::from("py"),
                args: vec![OsString::from("-3")],
                home: None,
            });
            candidates.push(PythonCandidate {
                label: "python",
                program: OsString::from("python"),
                args: Vec::new(),
                home: None,
            });
            candidates.push(PythonCandidate {
                label: "python3",
                program: OsString::from("python3"),
                args: Vec::new(),
                home: None,
            });
        }

        #[cfg(not(target_os = "windows"))]
        {
            candidates.push(PythonCandidate {
                label: "python3",
                program: OsString::from("python3"),
                args: Vec::new(),
                home: None,
            });
            candidates.push(PythonCandidate {
                label: "python",
                program: OsString::from("python"),
                args: Vec::new(),
                home: None,
            });
        }

        candidates
    }

    #[cfg(target_os = "windows")]
    fn find_bundled_python(script_path: &Path) -> Option<PathBuf> {
        let engine_dir = script_path.parent()?;
        [
            engine_dir.join("python/windows/python.exe"),
            engine_dir.join("python/python.exe"),
        ]
        .into_iter()
        .find(|path| path.exists())
    }

    fn build_python_path(vendor_path: &Path) -> Result<OsString, EngineError> {
        let mut paths = vec![vendor_path.to_path_buf()];

        if let Some(existing_python_path) = std::env::var_os("PYTHONPATH") {
            paths.extend(std::env::split_paths(&existing_python_path));
        }

        std::env::join_paths(paths).map_err(|error| {
            EngineError::ProcessLaunchFailed(format!("Invalid PYTHONPATH: {error}"))
        })
    }

    fn find_vendor_path(app: &AppHandle) -> Option<PathBuf> {
        use tauri::Manager;
        
        if let Ok(resource_dir) = app.path().resource_dir() {
            let resource_path = resource_dir.join("resources/engine/vendor");
            if resource_path.exists() {
                return Some(resource_path);
            }
            let alt_path = resource_dir.join("engine/vendor");
            if alt_path.exists() {
                return Some(alt_path);
            }
        }

        // Buscar en recursos empaquetados
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let vendor_path = exe_dir.join("resources/engine/vendor");
                if vendor_path.exists() {
                    return Some(vendor_path);
                }
            }
        }

        // Buscar en desarrollo
        let dev_path = PathBuf::from("src-tauri/resources/engine/vendor");
        if dev_path.exists() {
            return Some(dev_path);
        }

        // Buscar en el proyecto raíz
        let root_path = PathBuf::from("../Resources/python/vendor");
        if root_path.exists() {
            return Some(root_path);
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
    Err(EngineError::ProcessLaunchFailed(
        "Engine not available in state".to_string(),
    ))
}

pub async fn pause_download() -> Result<(), EngineError> {
    let _command = serde_json::json!({
        "command": "pause"
    });

    // TODO: Enviar comando
    Err(EngineError::ProcessLaunchFailed(
        "Engine not available in state".to_string(),
    ))
}

pub async fn resume_download() -> Result<(), EngineError> {
    let _command = serde_json::json!({
        "command": "resume"
    });

    // TODO: Enviar comando
    Err(EngineError::ProcessLaunchFailed(
        "Engine not available in state".to_string(),
    ))
}

pub async fn cancel_download() -> Result<(), EngineError> {
    let _command = serde_json::json!({
        "command": "cancel"
    });

    // TODO: Enviar comando
    Err(EngineError::ProcessLaunchFailed(
        "Engine not available in state".to_string(),
    ))
}
