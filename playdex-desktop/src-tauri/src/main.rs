#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod csv_parser;
mod engine_process;
mod keyring;
mod settings;
mod types;
mod xml_parser;

use std::path::PathBuf;
use std::sync::Mutex;

use crate::engine_process::EngineProcess;
use crate::types::Playlist;

struct AppState {
    engine: Mutex<Option<EngineProcess>>,
}

fn main() {
    let app_state = AppState {
        engine: Mutex::new(None),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            start_engine,
            restart_engine,
            download_playlist,
            pause_download,
            resume_download,
            cancel_download,
            get_settings,
            save_settings,
            get_arl,
            save_arl,
            import_xml,
            import_csv,
            open_folder,
            reveal_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn start_engine(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let engine = EngineProcess::new(app.clone());
    engine.start().map_err(|e| e.to_string())?;

    let mut engine_guard = state.engine.lock().map_err(|e| e.to_string())?;
    *engine_guard = Some(engine);

    Ok(())
}

#[tauri::command]
async fn restart_engine(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    {
        let mut engine_guard = state.engine.lock().map_err(|e| e.to_string())?;
        if let Some(engine) = engine_guard.take() {
            engine.stop();
        }
    }
    
    start_engine(app, state).await
}

#[tauri::command]
async fn download_playlist(
    playlist: Playlist,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let engine_guard = state.engine.lock().map_err(|e| e.to_string())?;

    if let Some(engine) = engine_guard.as_ref() {
        let command = serde_json::json!({
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

        engine.send_command(command).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Engine not started".to_string())
    }
}

#[tauri::command]
async fn pause_download(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let engine_guard = state.engine.lock().map_err(|e| e.to_string())?;

    if let Some(engine) = engine_guard.as_ref() {
        let command = serde_json::json!({
            "command": "pause"
        });

        engine.send_command(command).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Engine not started".to_string())
    }
}

#[tauri::command]
async fn resume_download(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let engine_guard = state.engine.lock().map_err(|e| e.to_string())?;

    if let Some(engine) = engine_guard.as_ref() {
        let command = serde_json::json!({
            "command": "resume"
        });

        engine.send_command(command).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Engine not started".to_string())
    }
}

#[tauri::command]
async fn cancel_download(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let engine_guard = state.engine.lock().map_err(|e| e.to_string())?;

    if let Some(engine) = engine_guard.as_ref() {
        let command = serde_json::json!({
            "command": "cancel"
        });

        engine.send_command(command).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Engine not started".to_string())
    }
}

#[tauri::command]
async fn get_settings() -> Result<settings::Settings, String> {
    settings::get_settings().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_settings(settings: settings::Settings) -> Result<(), String> {
    settings::save_settings(settings)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_arl() -> Result<String, String> {
    keyring::get_arl().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_arl(arl: String) -> Result<(), String> {
    keyring::save_arl(arl).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn import_xml(custom_path: Option<String>) -> Result<Vec<Playlist>, String> {
    let path = custom_path.map(PathBuf::from);
    xml_parser::load_playlists_from_xml(path.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn import_csv(path: String) -> Result<Playlist, String> {
    csv_parser::load_playlist_from_csv(std::path::Path::new(&path))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    opener::open(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn reveal_file(path: String) -> Result<(), String> {
    opener::reveal(&path).map_err(|e| e.to_string())
}
