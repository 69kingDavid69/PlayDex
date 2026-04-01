# PlayDex Desktop — Arquitectura y estado actual
## Extensión Windows / Linux (sin modificar la app macOS existente)

---

## 1. Estado actual del subproyecto

La carpeta `playdex-desktop/` ya contiene un MVP funcional del cliente Windows/Linux.

### Funcionalidad implementada

- Importación de playlists desde XML exportado de Music/iTunes.
- Importación de playlists desde CSV de Spotify o Exportify.
- Backend Tauri en Rust que lanza el engine Python y retransmite eventos al frontend.
- Cola de descargas con progreso, pausa, reanudación y cancelación.
- Build del frontend con Vite y validación del backend con `cargo test`.
- Pipeline de GitHub para CI y releases de Windows/Linux.

### Módulos ya presentes

| Área | Archivos principales |
|---|---|
| Frontend React | `src/App.tsx`, `src/components/*`, `src/store/downloadStore.ts` |
| Backend Tauri | `src-tauri/src/main.rs`, `engine_process.rs`, `csv_parser.rs`, `xml_parser.rs` |
| Configuración | `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` |
| Recursos del engine | `src-tauri/resources/engine/` |

### Nota de alcance

La UI de Ajustes ya existe, pero el acoplamiento completo con persistencia y ARL todavía se apoya sobre la infraestructura Rust preparada en `settings.rs` y `keyring.rs`.

---

## 2. Contexto del proyecto

PlayDex es una app nativa macOS escrita en Swift/SwiftUI que importa playlists desde XML de iTunes/Music o CSV de Spotify y las descarga en alta calidad (FLAC / MP3 320) a través de Deezer usando el motor `deemix`.

**El objetivo de esta extensión es:**
> Desarrollar una versión funcional de PlayDex para Windows y Linux, reutilizando el 100% de la lógica existente del engine Python (`deemix_engine.py`), sin tocar ningún archivo del proyecto macOS.

---

## 3. Restricción fundamental

```
❌ NO modificar ningún archivo bajo:
   App/
   Models/
   Services/
   Views/
   Resources/python/   ← solo lectura, se usa como referencia del engine original
   PlayDex.xcodeproj

✅ SOLO crear archivos nuevos bajo:
   playdex-desktop/    ← carpeta nueva en la raíz del repo
```

---

## 4. Stack tecnológico elegido: Tauri v2 + React

### ¿Por qué Tauri y no Electron, C# o Java?

| Criterio | Tauri | Electron | C# MAUI | Java/JavaFX |
|---|---|---|---|---|
| Binario final | ~8 MB | ~150 MB | ~30–80 MB | ~50–100 MB + JVM |
| Linux nativo real | ✅ | ✅ | ⚠️ experimental | ⚠️ no nativo |
| Runtime requerido | Ninguno | Ninguno | .NET | JVM |
| Look nativo | ✅ WebView del SO | ⚠️ Chromium | ⚠️ Parcial | ❌ |
| Lanzar proceso Python | `std::process` Rust | `child_process` Node | `Process` .NET | `ProcessBuilder` |
| UI moderna con JS | ✅ React/Svelte | ✅ | ❌ | ❌ |

Tauri usa el WebView nativo del sistema (WebView2 en Windows, WebKit en Linux) y compila el backend en Rust. La UI se escribe en cualquier framework web. El proceso Python se lanza desde Rust igual que `PythonBridge.swift` lo hace desde Swift, usando el mismo protocolo JSON.

---

## 5. Arquitectura general

```
PlayDex/ (repo existente — raíz)
├── App/                        ← Swift, NO TOCAR
├── Models/                     ← Swift, NO TOCAR
├── Services/                   ← Swift, NO TOCAR
├── Views/                      ← Swift, NO TOCAR
├── Resources/
│   └── python/                 ← Engine compartido, NO TOCAR
│       ├── deemix_engine.py
│       ├── requirements.txt
│       └── vendor/
├── PlayDex.xcodeproj           ← NO TOCAR
│
└── playdex-desktop/            ← ✅ NUEVO — todo el trabajo va aquí
    ├── src-tauri/
    │   ├── Cargo.toml
    │   ├── tauri.conf.json
    │   └── src/
    │       ├── main.rs
    │       ├── engine_process.rs    ← equivalente de PythonBridge.swift
    │       ├── settings.rs          ← equivalente de SettingsStore.swift
    │       ├── csv_parser.rs        ← equivalente de CSVLibraryParser.swift
    │       ├── xml_parser.rs        ← equivalente de iTunesLibraryParser.swift
    │       └── keyring.rs           ← equivalente de KeychainStore.swift
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── PlaylistSidebar.tsx  ← equivalente de PlaylistSidebarView.swift
    │   │   ├── TrackList.tsx        ← equivalente de TrackListView.swift
    │   │   ├── DownloadQueue.tsx    ← equivalente de DownloadQueueView.swift
    │   │   ├── Settings.tsx         ← equivalente de SettingsView.swift
    │   │   └── EmptyState.tsx
    │   ├── store/
    │   │   └── downloadStore.ts     ← equivalente de DownloadManager.swift
    │   └── types/
    │       └── index.ts             ← equivalente de Models Swift (Track, Playlist, etc.)
    ├── package.json
    ├── vite.config.ts
    └── README.md
```

---

## 6. El protocolo JSON (contrato central)

Este es el contrato que ya existe entre cualquier cliente y el engine Python. **No cambia. Es la fuente de verdad.**

### 6.1 Comandos — cliente → engine (stdin)

```jsonc
// Iniciar descarga de playlist
{
  "command": "download_playlist",
  "playlist": {
    "id": "uuid-string",
    "name": "Mi Playlist",
    "source": "csvLibrary",
    "tracks": [
      {
        "id": "uuid-string",
        "artist": "Nombre Artista",
        "title": "Nombre Canción",
        "album": "Nombre Álbum",       // opcional
        "isrc": "USABC1234567",        // opcional
        "durationSeconds": 213.5       // opcional
      }
    ]
  }
}

// Control de cola
{ "command": "pause" }
{ "command": "resume" }
{ "command": "cancel" }
```

### 6.2 Eventos — engine → cliente (stdout, una línea JSON por evento)

```jsonc
// Bridge listo
{
  "event": "bridge_ready",
  "deemix_available": true,
  "download_ready": true,
  "arl_present": true
}

// Progreso de descarga
{
  "event": "progress",
  "track": { "artist": "...", "title": "..." },
  "percent": 47.5,
  "speed_kbps": 1024.0,
  "eta_seconds": 8
}

// Descarga completada
{
  "event": "completed",
  "track": { "artist": "...", "title": "..." },
  "file_path": "/ruta/al/archivo.flac",
  "audio_format": "FLAC",
  "file_size_mb": 24.3,
  "speed_kbps": 980.0
}

// Canción omitida (ya existe)
{
  "event": "skipped",
  "track": { "artist": "...", "title": "..." },
  "reason": "already_exists",
  "existing_file": "/ruta/existente.flac",
  "existing_playlist": "Playlist Anterior"
}

// Error en canción
{
  "event": "error",
  "track": { "artist": "...", "title": "..." },
  "error_code": "NOT_FOUND",
  "message": "No se encontró en Deezer"
}

// Playlist completa
{
  "event": "playlist_done",
  "playlist": "Mi Playlist",
  "stats": {
    "completed": 42,
    "skipped": 3,
    "errors": 1
  }
}

// Error del bridge
{
  "event": "bridge_error",
  "error_code": "PROCESS_EXITED",
  "message": "El bridge Python finalizó con código 1."
}
```

### 6.3 Variables de entorno que el engine lee

```
DEEMIX_ITUNES_ARL          → token ARL de Deezer (string)
DEEMIX_ITUNES_CONFIG_PATH  → ruta al config.json del engine
PYTHONPATH                 → debe incluir la carpeta vendor/
PYTHONUNBUFFERED           → "1" (obligatorio para streaming de stdout)
```

---

## 7. Módulo Rust: `engine_process.rs`

Este módulo es el corazón del backend Tauri. Es la traducción directa de `PythonBridge.swift`.

**Responsabilidades:**
- Localizar el intérprete Python (bundled o sistema)
- Localizar `deemix_engine.py` en la carpeta `engine/`
- Lanzar el proceso con `std::process::Command`
- Escribir comandos JSON en stdin (una línea por comando)
- Leer eventos JSON de stdout línea por línea
- Emitir eventos al frontend mediante `tauri::AppHandle::emit`
- Manejar terminación del proceso y reconexión

**Equivalencias de implementación:**

| Swift (`PythonBridge.swift`) | Rust (`engine_process.rs`) |
|---|---|
| `Process()` | `std::process::Command` |
| `Pipe()` stdin/stdout | `Stdio::piped()` |
| `readabilityHandler` | `BufReader::lines()` en thread |
| `process.environment` | `.env()` en Command |
| `JSONDecoder` | `serde_json::from_str` |
| `JSONEncoder` | `serde_json::to_string` |
| `onEvent` closure | `AppHandle::emit("engine-event", payload)` |

---

## 8. Módulo Rust: `settings.rs`

Equivalente de `SettingsStore.swift`. Gestiona persistencia de configuración.

**Campos a persistir:**

```rust
pub struct Settings {
    pub download_location: String,      // default: ~/Music/PlayDex
    pub preferred_format: AudioFormat,  // "FLAC" | "MP3_320"
    pub allow_fallback: bool,           // default: true
    pub reject_below_320: bool,         // default: true
    pub parallel_downloads: u8,         // default: 3
    pub retry_count: u8,               // default: 2
    // arl_token → gestionado por keyring.rs, NO en archivo
}
```

**Mecanismo de persistencia por plataforma:**

| macOS (original) | Windows | Linux |
|---|---|---|
| `UserDefaults` | `AppData\Roaming\PlayDex\config.json` | `~/.config/playdex/config.json` |

Usar el crate `dirs` para resolver las rutas por plataforma.

**Config del engine** — al cambiar cualquier setting, regenerar `~/.deemix-itunes/config.json` (mismo formato que genera `SettingsStore.swift`):

```json
{
  "downloadLocation": "~/Music/PlayDex",
  "quality": {
    "preferred": "FLAC",
    "fallback_chain": ["FLAC", "MP3_320"],
    "reject_below": "MP3_320"
  },
  "parallelDownloads": 3,
  "retryCount": 2
}
```

---

## 8. Módulo Rust: `keyring.rs`

Equivalente de `KeychainStore.swift`. Almacena el token ARL de forma segura.

**Mecanismo por plataforma:**

| macOS (original) | Windows | Linux |
|---|---|---|
| macOS Keychain | Windows Credential Manager | libsecret / KWallet |

Usar el crate `keyring` (v2+) que abstrae los tres sistemas con una API uniforme:

```rust
let entry = keyring::Entry::new("playdex", "deezer-arl")?;
entry.set_password(&arl_token)?;
let arl = entry.get_password()?;
```

---

## 9. Parsers Rust

### 9.1 `csv_parser.rs` — equivalente de `CSVLibraryParser.swift`

Detectar automáticamente columnas en el CSV. Columnas reconocidas:

```
Track Name | Title | Song       → título de la canción
Artist Name(s) | Artist        → artista
Album                          → álbum (opcional)
ISRC                           → ISRC (opcional)
Duration (ms)                  → duración en ms → convertir a segundos
```

Usar el crate `csv` con `StringRecord`. El nombre del archivo (sin extensión) se usa como nombre de la playlist.

### 9.2 `xml_parser.rs` — equivalente de `iTunesLibraryParser.swift`

Parsear el formato XML de iTunes/Music (plist). Usar el crate `plist`.

Estructura relevante del XML:
```
Library > Tracks > {id} > Name, Artist, Album, Total Time, ISRC
Library > Playlists[] > Name, Playlist Items[] > Track ID
```

---

## 10. Modelos de datos TypeScript (frontend)

Deben ser equivalentes exactos de los modelos Swift:

```typescript
// Equivalente de AudioFormat.swift
type AudioFormat = 'FLAC' | 'MP3_320'

// Equivalente de PlaylistSource
type PlaylistSource = 'xmlLibrary' | 'csvLibrary' | 'musicKit'

// Equivalente de Track.swift
interface Track {
  id: string
  artist: string
  title: string
  album?: string
  isrc?: string
  durationSeconds?: number
}

// Equivalente de Playlist.swift
interface Playlist {
  id: string
  name: string
  tracks: Track[]
  source: PlaylistSource
}

// Equivalente de DownloadState
type DownloadState = 'pending' | 'downloading' | 'completed' | 'skipped' | 'error' | 'paused'

// Equivalente de DownloadJob.swift
interface DownloadJob {
  id: string
  playlistName: string
  track: Track
  status: DownloadState
  audioFormat?: AudioFormat
  progressPercent: number
  speedKbps?: number
  etaSeconds?: number
  filePath?: string
  fileSizeMB?: number
  message?: string
  existingPlaylist?: string
}
```

---

## 11. Store del frontend: `downloadStore.ts`

Equivalente de `DownloadManager.swift`. Usar Zustand o Jotai.

**Estado global:**

```typescript
interface DownloadStore {
  // Estado
  playlists: Playlist[]
  selectedPlaylistId: string | null
  jobs: DownloadJob[]
  bridgeStatusText: string
  lastErrorMessage: string | null
  isPaused: boolean
  csvPlaylistUrl: string | null

  // Acciones — mapean a comandos Tauri
  bootstrapIfNeeded: () => Promise<void>
  reloadPlaylists: () => Promise<void>
  importLibraryXML: () => Promise<void>
  importCSV: () => Promise<void>
  clearImportedCSV: () => void
  queueSelectedPlaylist: () => void
  pauseAll: () => void
  resumeAll: () => void
  cancelAll: () => void

  // Computed
  selectedPlaylist: Playlist | null
  isDownloading: boolean
  queueSummary: QueueSummary
  menuBarStatusText: string
}
```

**Suscripción a eventos del engine:**

```typescript
// Al inicializar el store
import { listen } from '@tauri-apps/api/event'

listen<EngineEvent>('engine-event', ({ payload }) => {
  downloadStore.handleEngineEvent(payload)
})
```

---

## 12. Comandos Tauri (IPC)

Los Tauri commands son la capa de comunicación entre el frontend React y el backend Rust. Son el equivalente del binding SwiftUI ↔ DownloadManager.

```rust
// Comandos a implementar en main.rs
#[tauri::command] start_engine(app: AppHandle) -> Result<(), String>
#[tauri::command] download_playlist(playlist: Playlist) -> Result<(), String>
#[tauri::command] pause_download() -> Result<(), String>
#[tauri::command] resume_download() -> Result<(), String>
#[tauri::command] cancel_download() -> Result<(), String>
#[tauri::command] get_settings() -> Result<Settings, String>
#[tauri::command] save_settings(settings: Settings) -> Result<(), String>
#[tauri::command] get_arl() -> Result<String, String>
#[tauri::command] save_arl(arl: String) -> Result<(), String>
#[tauri::command] import_xml(custom_path: Option<String>) -> Result<Vec<Playlist>, String>
#[tauri::command] import_csv() -> Result<Playlist, String>
#[tauri::command] open_folder(path: String) -> Result<(), String>
#[tauri::command] reveal_file(path: String) -> Result<(), String>
```

---

## 13. Empaquetado del engine Python

El engine Python ya se empaqueta dentro del subproyecto. La estructura actual es:

```
playdex-desktop/
└── src-tauri/
    └── resources/
        └── engine/
            ├── deemix_engine.py
            ├── vendor/
            └── requirements.txt
```

En `tauri.conf.json`:
```json
{
  "bundle": {
    "resources": ["resources/engine/**/*"]
  }
}
```

**Intérprete Python:**

- En desarrollo: usar el Python3 del sistema
- En producción (Windows): resolver en runner nativo de GitHub si se decide embutir intérprete en una fase posterior
- En producción (Linux): detectar `python3` en `PATH` o evolucionar a sidecar dedicado si el release final lo requiere

Localizar el engine en runtime usando `tauri::api::path::resource_dir()`.

---

## 14. Diferencias de plataforma — tabla de equivalencias

| Funcionalidad | macOS (Swift) | Windows/Linux (Rust/Tauri) |
|---|---|---|
| Keychain | `Security.framework` | crate `keyring` v2 |
| File picker | `NSOpenPanel` | crate `rfd` o Tauri dialog plugin |
| Notificaciones | `UNUserNotificationCenter` | Tauri notification plugin |
| Menu bar icon | `NSStatusItem` | Tauri tray plugin |
| UserDefaults | `Foundation.UserDefaults` | crate `serde_json` + `dirs` |
| Config path | `~/.deemix-itunes/` | Mismo path (cross-platform) |
| DB path | `~/.deemix-itunes/db.sqlite` | Mismo path (cross-platform) |
| Reveal en Finder | `NSWorkspace.activateFileViewerSelecting` | `opener::reveal` (crate) |

---

## 15. Crates Rust recomendados

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "notification"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
keyring = "2"
dirs = "5"
csv = "1"
plist = "1"
rfd = "0.14"          # file dialogs nativos
opener = "0.7"        # abrir archivos / revelar en explorador
anyhow = "1"
```

---

## 16. Fases de desarrollo

### Fase 1 — Fundación (MVP funcional)
- [x] Scaffold del proyecto Tauri con React + TypeScript + Vite
- [x] `engine_process.rs` — lanzar proceso Python y leer eventos
- [x] `settings.rs` — leer/escribir configuración y generar config del engine
- [x] `keyring.rs` — guardar y recuperar ARL
- [x] Tipos TypeScript completos
- [x] `downloadStore.ts` con Zustand
- [x] Suscripción a eventos del engine en el frontend
- [x] UI básica: sidebar de playlists + lista de tracks + cola de descarga

### Fase 2 — Feature parity
- [x] `csv_parser.rs` — importar CSV de Spotify
- [x] `xml_parser.rs` — importar XML de iTunes/Music
- [x] Diálogos de archivo nativos con `rfd`
- [ ] Pantalla de ajustes completa
- [ ] Notificaciones nativas al completar playlist
- [ ] Tray icon con estado de descarga

### Fase 3 — Distribución
- [ ] Bundle del engine Python con intérprete embebido (Windows)
- [ ] Firma de código y NSIS installer para Windows
- [ ] AppImage / .deb para Linux
- [x] Pipeline de CI/CD con GitHub Actions (matrix: windows-latest, ubuntu-latest)

---

## 17. Convenciones de desarrollo

- Idioma de los comentarios en código: **español** (coherente con el proyecto original)
- Idioma de la UI: **español** (coherente con la app macOS)
- Formato del código Rust: `cargo fmt` antes de cada commit
- Formato del código TS: Prettier con config del proyecto
- Commits: convencional (`feat:`, `fix:`, `chore:`)
- Ningún commit debe modificar archivos fuera de `playdex-desktop/`

---

## 18. Referencia rápida — mapeo Swift → Rust/TS

| Archivo Swift | Equivalente nuevo |
|---|---|
| `PythonBridge.swift` | `src-tauri/src/engine_process.rs` |
| `DownloadManager.swift` | `src/store/downloadStore.ts` |
| `SettingsStore.swift` | `src-tauri/src/settings.rs` |
| `KeychainStore.swift` | `src-tauri/src/keyring.rs` |
| `CSVLibraryParser.swift` | `src-tauri/src/csv_parser.rs` |
| `iTunesLibraryParser.swift` | `src-tauri/src/xml_parser.rs` |
| `ContentView.swift` | `src/App.tsx` |
| `PlaylistSidebarView.swift` | `src/components/PlaylistSidebar.tsx` |
| `TrackListView.swift` | `src/components/TrackList.tsx` |
| `DownloadQueueView.swift` | `src/components/DownloadQueue.tsx` |
| `SettingsView.swift` | `src/components/Settings.tsx` |
| `EmptyStateView.swift` | `src/components/EmptyState.tsx` |
| `Track.swift` | `src/types/index.ts → Track` |
| `Playlist.swift` | `src/types/index.ts → Playlist` |
| `DownloadJob.swift` | `src/types/index.ts → DownloadJob` |

---

*Documento generado a partir del análisis completo del repositorio `69kingDavid69/PlayDex`.*
*Versión macOS intacta. Toda implementación nueva va exclusivamente en `playdex-desktop/`.*
