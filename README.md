# PlayDex

PlayDex reúne dos aplicaciones de escritorio para importar playlists desde bibliotecas existentes y descargarlas en alta calidad con Deezer + deemix:

- `macOS`: app nativa escrita en SwiftUI.
- `Windows / Linux`: extensión multiplataforma en `playdex-desktop/`, construida con Tauri v2 + React + Rust.

## Características del proyecto

- Importación de playlists desde XML exportado de Music/iTunes.
- Importación de playlists desde CSV de Spotify y formatos compatibles.
- Descarga de canciones en FLAC o MP3 320.
- Cola con progreso en tiempo real y control de pausa, reanudación y cancelación.
- Reutilización del engine Python de PlayDex dentro de empaquetados de escritorio.
- Persistencia segura del token ARL según la plataforma.

## Estado por plataforma

| Plataforma | Estado | Ubicación | Notas |
|---|---|---|---|
| macOS | estable | `App/`, `Services/`, `Views/` | App original nativa con SwiftUI |
| Windows / Linux | MVP funcional | `playdex-desktop/` | UI React, backend Rust, empaquetado por GitHub Actions |

## Estructura del repositorio

```
PlayDex/
├── App/                  # App macOS (Swift / SwiftUI)
├── Models/
├── Services/
├── Views/
├── Resources/python/     # Engine Python compartido del proyecto original
├── PlayDex.xcodeproj
└── playdex-desktop/      # Extensión Windows/Linux con Tauri + React + Rust
```

## Desarrollo rápido

### App macOS

```bash
open PlayDex.xcodeproj
```

Pulsa `Cmd + R` en Xcode para compilar y ejecutar la app macOS.

### PlayDex Desktop (Windows / Linux)

```bash
cd playdex-desktop
npm ci
npm run check
npm run tauri:dev
```

`npm run check` compila el frontend y ejecuta las pruebas de Rust del backend Tauri.

## Releases de Windows y Linux

El subproyecto `playdex-desktop/` queda preparado para publicar binarios desde GitHub Actions. El flujo de release se activa al empujar una etiqueta con este formato:

```bash
git tag playdex-desktop-v0.1.0
git push origin playdex-desktop-v0.1.0
```

La acción de GitHub genera un draft release con los assets de Windows y Linux soportados por Tauri para esos runners.
Antes de empaquetar, el workflow regenera las dependencias Python del engine en cada runner para evitar publicar binarios nativos de macOS dentro de los builds de Windows/Linux.

## Documentación adicional

- [`playdex-desktop/README.md`](playdex-desktop/README.md)
- [`playdex-desktop/SETUP.md`](playdex-desktop/SETUP.md)
- [`playdex-desktop/ArquitecturaWinLin.md`](playdex-desktop/ArquitecturaWinLin.md)
- [`playdex-desktop/SkillsMcpWinLin.md`](playdex-desktop/SkillsMcpWinLin.md)

## Licencia

Distribuido bajo la licencia MIT. Consulta `LICENSE` para más detalles.
