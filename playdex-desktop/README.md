# PlayDex Desktop

Cliente de escritorio para Windows y Linux de PlayDex, construido con Tauri v2 + React + Rust y empaquetado desde este mismo repositorio.

## Qué hace hoy

- Importa playlists desde XML exportado de Music/iTunes.
- Importa playlists desde CSV de Spotify y archivos compatibles.
- Lanza el engine Python de PlayDex desde Rust.
- Muestra cola de descargas con progreso en tiempo real.
- Permite pausar, reanudar y cancelar la cola.
- Se publica en GitHub con builds nativos para Windows y Linux.

## Stack

- `Frontend`: React + TypeScript + Zustand + Vite
- `Backend`: Tauri v2 + Rust
- `Engine`: Python (`src-tauri/resources/engine/deemix_engine.py`)

## Estructura

```text
playdex-desktop/
├── src/                     # UI React
├── src-tauri/src/           # Backend Rust
├── src-tauri/resources/     # Engine Python empaquetado
├── package.json
├── SETUP.md
├── ArquitecturaWinLin.md
└── SkillsMcpWinLin.md
```

## Comandos principales

```bash
npm ci
npm run check
npm run tauri:dev
npm run tauri:build
```

## GitHub

### CI

```text
.github/workflows/playdex-desktop-ci.yml
```

Valida el subproyecto en Ubuntu y Windows.

### Release

```text
.github/workflows/playdex-desktop-release.yml
```

Para publicar binarios:

```bash
git tag playdex-desktop-v0.1.2
git push origin playdex-desktop-v0.1.2
```

El workflow publica la release con los assets generados por Tauri en runners Windows y Linux.
Durante ese proceso también reconstruye el vendor Python del engine en cada runner para que los paquetes nativos coincidan con la plataforma destino.
En Windows, además descarga y empaqueta un runtime embebido de Python para que el instalador no dependa de una instalación previa del usuario.

## Documentación relacionada

- [`SETUP.md`](SETUP.md)
- [`ArquitecturaWinLin.md`](ArquitecturaWinLin.md)
- [`SkillsMcpWinLin.md`](SkillsMcpWinLin.md)
