# PlayDex

App macOS nativa para importar playlists desde **XML de Music/iTunes** o **CSV de Spotify** y descargarlas en alta calidad a través de Deezer usando deemix.

## Características

- Importa playlists desde **XML** exportado de Music/iTunes
- Importa playlists desde **CSV** de Spotify (y otras apps compatibles)
- Descarga canciones en FLAC o MP3 320 vía Deezer + deemix
- Cola de descarga con progreso en tiempo real, pausa y cancelación
- Token ARL persistido de forma segura en el **Keychain de macOS**
- Icono en la barra de menú con estado de descarga
- Carpeta de destino con el nombre de la playlist

## Distribución

La app se distribuye como `.app` / `.dmg` **fuera de la Mac App Store**.  
No está disponible en el App Store por depender de credenciales de sesión de Deezer (ARL).

> **Nota:** Necesitas un token ARL de Deezer activo. Configúralo en Ajustes al abrir la app por primera vez.

## Requisitos

- macOS 13 Ventura o superior
- Xcode 16+ (para compilar desde código fuente)
- Python 3 (incluido dentro del bundle de la app)

## Instalación desde código fuente

```bash
git clone https://github.com/tu-usuario/PlayDex.git
cd PlayDex
open PlayDex.xcodeproj
```

Pulsa `⌘R` en Xcode para compilar y ejecutar.

## Estructura del proyecto

```
App/          → Entry point, AppDelegate
Models/       → Playlist, Track, DownloadJob
Services/     → DownloadManager, ITunesLibraryParser, CSVLibraryParser,
                PythonBridge, SettingsStore, KeychainStore
Views/        → ContentView, PlaylistSidebarView, TrackListView,
                DownloadQueueView, SettingsView
Resources/    → Python backend (deemix_engine.py + dependencias)
```

## Formatos de CSV soportados

El parser detecta automáticamente las columnas. Compatible con exportaciones de:
- Spotify (exportado con [Exportify](https://exportify.net) u otras herramientas)
- Cualquier CSV con columnas identificables de título y artista

Columnas reconocidas: `Track Name`, `Title`, `Song`, `Artist Name(s)`, `Artist`, `Album`, `ISRC`, `Duration (ms)`.

## Licencia

Distribuido bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.
