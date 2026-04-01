# PlayDex Desktop — Skills & MCPs de Desarrollo
 
Guía de herramientas de IA para el desarrollo de la extensión Windows/Linux de PlayDex.
Cada skill y MCP está justificado con el módulo específico del proyecto donde aplica.
 
---
 
## Tabla de contenido
 
- [Skills existentes (ya disponibles)](#1-skills-existentes-ya-disponibles)
- [Skills creadas para este proyecto](#2-skills-creadas-para-este-proyecto)
- [MCPs recomendados](#3-mcps-recomendados)
- [Configuración rápida](#4-configuración-rápida-mcp-config-json)
- [Mapa skills ↔ módulos del proyecto](#5-mapa-skills--módulos-del-proyecto)
 
---
 
## 1. Skills existentes (ya disponibles)
 
### `frontend-design`
**Ubicación:** `/mnt/skills/public/frontend-design/SKILL.md`
 
**¿Cuándo usarla?** Al construir los componentes React de la UI:
- `PlaylistSidebar.tsx` — sidebar con lista de playlists
- `TrackList.tsx` — tabla de canciones con estado de descarga
- `DownloadQueue.tsx` — cola con progreso en tiempo real, barras de progreso, badges FLAC/MP3
- `Settings.tsx` — formulario de configuración con campos de ruta, formato de audio, sliders
- `EmptyState.tsx` — pantalla vacía con call-to-action
 
La app macOS tiene un diseño cuidado. Esta skill ayuda a replicar ese nivel de polish en React con Tailwind.
 
---
 
### `docx`
**Ubicación:** `/mnt/skills/public/docx/SKILL.md`
 
**¿Cuándo usarla?** Para generar documentación técnica entregable:
- Guía de instalación para usuarios finales (Windows/Linux)
- Documentación del protocolo JSON del engine para contribuidores
- Changelog de versiones
 
---
 
### `xlsx`
**Ubicación:** `/mnt/skills/public/xlsx/SKILL.md`
 
**¿Cuándo usarla?** Al construir el parser de CSV en Rust (`csv_parser.rs`):
- Generar un archivo de prueba con los formatos de columnas de Spotify/Exportify
- Documentar los formatos de CSV soportados y sus variaciones
 
---
 
### `pdf`
**Ubicación:** `/mnt/skills/public/pdf/SKILL.md`
 
**¿Cuándo usarla?** Para distribuir la guía de usuario o documentación técnica en formato PDF con el release del instalador.
 
---
 
### `file-reading`
**Ubicación:** `/mnt/skills/public/file-reading/SKILL.md`
 
**¿Cuándo usarla?** Al leer y analizar archivos del proyecto en contexto:
- Leer el `deemix_engine.py` completo para entender el protocolo JSON
- Inspeccionar archivos `.plist` XML de iTunes de ejemplo para construir el parser
- Revisar el `Cargo.toml` generado por Tauri para validar dependencias
 
---
 
### `skill-creator`
**Ubicación:** `/mnt/skills/examples/skill-creator/SKILL.md`
 
**¿Cuándo usarla?** Si en el desarrollo surge la necesidad de un nuevo skill especializado que no existe. Por ejemplo: un skill para gestionar GitHub Actions de CI/CD multiplataforma, o uno para escribir tests de integración Rust.
 
---
 
## 2. Skills creadas para este proyecto

### `tauri-rust-desktop`
 
**Ubicación:** `/home/claude/skills/tauri-rust-desktop/SKILL.md`
 
Esta skill fue creada específicamente para este proyecto porque no existe ninguna skill pública que cubra el stack Tauri v2 + Rust + proceso externo Python.
 
**Cubre:**
 
| Módulo del proyecto | Contenido del skill |
|---|---|
| `engine_process.rs` | Patrón completo para lanzar proceso + leer JSON por línea en Rust |
| `settings.rs` | Persistencia cross-platform con `dirs` crate |
| `keyring.rs` | Keyring nativo en Windows/Linux/macOS con crate `keyring` v3 |
| `csv_parser.rs` / `xml_parser.rs` | Dependencias y estructura recomendada |
| `main.rs` | Registro de comandos Tauri, AppState con Mutex |
| `tauri.conf.json` | Configuración mínima de bundle y recursos |
| Frontend → Backend IPC | `invoke()` y `listen()` desde React |
| Errores comunes | Tabla de errores frecuentes y sus soluciones |
 
**Para activarla** al inicio de cada sesión de desarrollo:
```
Lee /home/claude/skills/tauri-rust-desktop/SKILL.md y síguelo para implementar [módulo].
```

---

### `skillguard`

**Instalación:**
```bash
npx skills add 69kingDavid69/skillguard
```

**¿Cuándo usarla?** Antes de hacer cambios de estructura, limpiezas o movimientos de archivos que puedan borrar algo importante por accidente:
- Reubicar archivos desde carpetas temporales como `macOS/` o prototipos viejos hacia la raíz del proyecto Windows/Linux
- Limpiar artefactos locales como `DerivedData/`, `.build/`, `.swiftpm/` o directorios generados por herramientas
- Validar el alcance de comandos como `rm -rf`, `git clean`, `git restore` o refactors grandes antes de ejecutarlos
- Revisar el diff final para confirmar que solo quedan cambios reales del producto y no basura generada

**Uso en prompts:**
```
Usa skillguard antes de reorganizar o borrar archivos del repo y valida qué se puede mover, conservar o eliminar sin afectar el código fuente del proyecto.
```

**Dónde aporta más en este proyecto:**
- Limpieza de restos de builds y artefactos locales durante el desarrollo multiplataforma
- Revisión de carpetas heredadas de la versión macOS antes de borrarlas o fusionarlas con la variante Windows/Linux
- Verificación final del árbol del repo antes de hacer commit o abrir PR en `69kingDavid69/PlayDex`

---

## 3. MCPs recomendados
 
### 🥇 ESENCIALES — instalar antes de empezar
 
---
 
#### Context7
**Repositorio:** `github.com/upstash/context7`
**npm:** `@upstash/context7-mcp`
 
**¿Por qué es crítico para este proyecto?**
Tauri v2, los crates de Rust (`keyring` v3, `tauri-plugin-dialog`, `serde`) y las APIs de `@tauri-apps/api` cambian con frecuencia. Sin Context7, Claude puede generar código con APIs deprecadas o de versiones anteriores.
 
**Módulos del proyecto donde aplica:**
- Toda la capa Rust de `src-tauri/`
- Integración de plugins Tauri (`tauri-plugin-dialog`, `tauri-plugin-notification`)
- APIs de `@tauri-apps/api/event` y `@tauri-apps/api/core` en el frontend
- Configuración de `tauri.conf.json` (el schema cambia entre minor versions)
 
**Instalación:**
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```
 
**Uso en prompts:**
```
Implementa engine_process.rs para lanzar el proceso Python. use context7 /tauri-apps/tauri
```
 
---
 
#### GitHub MCP
**Fuente:** MCP oficial de Anthropic / modelcontextprotocol
**npm:** `@modelcontextprotocol/server-github`
 
**¿Por qué?**
Todo el trabajo se hace en el repo `69kingDavid69/PlayDex`. Este MCP permite:
- Crear PRs directamente sin salir de Claude
- Leer el historial de commits para entender cambios recientes en el engine Python
- Crear issues para tracking de bugs por plataforma
- Navegar el árbol del repo sin necesidad de `git clone` repetido
 
**Módulos del proyecto donde aplica:**
- Flujo completo de desarrollo: crear rama → commit → PR
- Verificar que ningún commit toca archivos fuera de `playdex-desktop/`
- CI/CD: crear y editar `.github/workflows/build.yml`
 
**Instalación:**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "TU_TOKEN_AQUI"
      }
    }
  }
}
```
 
---
 
#### Tauri MCP (`@hypothesi/tauri-mcp-server`)
**Repositorio:** `github.com/hypothesi/mcp-server-tauri`
**npm:** `@hypothesi/tauri-mcp-server`
 
**¿Por qué?**
Es el MCP más completo y activamente mantenido para Tauri v2. Permite a Claude:
- Tomar screenshots de la app mientras corre en dev para detectar bugs visuales
- Inspeccionar el DOM del WebView en tiempo real
- Ejecutar JavaScript en el contexto de la app
- Ver logs de consola e IPC events sin abrir DevTools manualmente
 
**Módulos del proyecto donde aplica:**
- Debugging de `DownloadQueue.tsx` (verificar que los estados pending/downloading/completed se reflejan visualmente)
- Validar que el diálogo de archivo nativo (`tauri-plugin-dialog`) se abre correctamente
- Testear el sistema tray con estado de descarga
 
**Configuración:** Requiere añadir el plugin al `main.rs` de Tauri:
```rust
// Solo en builds de desarrollo
#[cfg(debug_assertions)]
builder = builder.plugin(tauri_plugin_mcp_bridge::init());
```
 
```bash
npx install-mcp @hypothesi/tauri-mcp-server --client claude-code
```
 
---
 
### 🥈 MUY ÚTILES — instalar en la primera semana
 
---
 
#### Rust MCP Server
**Repositorio:** `crates.io/crates/rust-mcp-server`
**Instalación:** `cargo install rust-mcp-server`
 
**¿Por qué?**
Expone el toolchain de Rust completo a Claude: `cargo check`, `cargo build`, `cargo test`, `cargo clippy`, `cargo fmt`, `cargo add`. Puede detectar errores de compilación, sugerir crates, y ejecutar el build sin salir de la conversación.
 
**Módulos del proyecto donde aplica:**
- Compilar `engine_process.rs` y ver errores en contexto
- Ejecutar `cargo clippy` sobre todo `src-tauri/src/` antes de cada PR
- `cargo add keyring serde_json tokio` para añadir dependencias
- Detectar dependencias no usadas con `cargo-machete`
 
**Configuración:**
```json
{
  "mcpServers": {
    "rust": {
      "command": "rust-mcp-server",
      "args": []
    }
  }
}
```
 
---
 
#### Filesystem MCP
**Fuente:** MCP oficial
**npm:** `@modelcontextprotocol/server-filesystem`
 
**¿Por qué?**
Acceso directo a los archivos del proyecto sin hacer `cat` o `read` manualmente. Especialmente útil para:
- Leer el `deemix_engine.py` en contexto mientras se implementa `engine_process.rs`
- Comparar el `PythonBridge.swift` original con el `engine_process.rs` nuevo en paralelo
- Navegar entre `src-tauri/src/` y `src/` durante el desarrollo del IPC
 
**Instalación:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/ruta/absoluta/al/repo/PlayDex"
      ]
    }
  }
}
```
 
---
 
#### Crates MCP (`cratedocs-mcp`)
**Repositorio:** `github.com/d6e/cratedocs-mcp`
 
**¿Por qué?**
Permite buscar y consultar documentación de crates directamente desde Claude sin abrir `docs.rs`. Complementa Context7 para crates menos conocidos como `plist`, `rfd`, o `opener`.
 
**Módulos del proyecto donde aplica:**
- Consultar la API exacta de `keyring::Entry` en la versión instalada
- Verificar métodos disponibles en el crate `plist` para parsear el XML de iTunes
- Buscar crates alternativos si alguna dependencia tiene problemas de compilación en Windows
 
**Instalación:**
```bash
git clone https://github.com/d6e/cratedocs-mcp.git
cd cratedocs-mcp && cargo build --release
```
```json
{
  "mcpServers": {
    "crates": {
      "command": "/ruta/a/cratedocs-mcp/target/release/cratedocs-mcp"
    }
  }
}
```
 
---
 
### 🥉 OPCIONALES — según necesidad
 
---
 
#### Playwright MCP
**npm:** `@playwright/mcp`
 
**¿Cuándo instalarlo?**
Si se decide escribir tests de integración E2E para la UI. Tauri expone el WebView como un target de Playwright, por lo que se puede automatizar clicks, inputs y verificar el estado de la cola de descarga programáticamente.
 
---
 
#### Docker MCP
**Fuente:** MCP oficial Docker
 
**¿Cuándo instalarlo?**
Para reproducir el build de Windows y Linux en contenedor desde macOS, garantizando que el `cargo tauri build` pasa en las plataformas destino antes de hacer el release.
 
---
 
#### Memory MCP
**npm:** `@modelcontextprotocol/server-memory`
 
**¿Cuándo instalarlo?**
Si el desarrollo se extiende en el tiempo y se necesita que Claude recuerde convenciones del proyecto entre sesiones: nombres de tipos Rust, decisiones de arquitectura, errores recurrentes resueltos.
 
---
 
## 4. Configuración rápida — `mcp-config.json`
 
Copia este archivo como punto de partida. Reemplaza los valores en `<MAYÚSCULAS>`:
 
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<TU_GITHUB_TOKEN>"
      }
    },
    "rust": {
      "command": "rust-mcp-server",
      "args": ["--log-level", "warn"]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "<RUTA_ABSOLUTA_AL_REPO>"
      ]
    },
    "tauri-mcp": {
      "command": "npx",
      "args": ["-y", "@hypothesi/tauri-mcp-server"]
    }
  }
}
```
 
**Ubicación del archivo según plataforma:**
 
| SO | Ruta |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |
 
---
 
## 5. Mapa skills ↔ módulos del proyecto
 
| Módulo / Tarea | Skill | MCP(s) |
|---|---|---|
| `engine_process.rs` | `tauri-rust-desktop` | Context7, Rust MCP |
| `settings.rs` | `tauri-rust-desktop` | Context7, Rust MCP |
| `keyring.rs` | `tauri-rust-desktop` | Context7, Crates MCP |
| `csv_parser.rs` | `tauri-rust-desktop` + `xlsx` | Rust MCP, Crates MCP |
| `xml_parser.rs` | `tauri-rust-desktop` | Rust MCP, Crates MCP |
| `main.rs` + comandos Tauri | `tauri-rust-desktop` | Context7, Rust MCP |
| `tauri.conf.json` | `tauri-rust-desktop` | Context7 |
| Componentes React UI | `frontend-design` | Context7, Tauri MCP |
| `downloadStore.ts` | `tauri-rust-desktop` | Context7 |
| Tipos TypeScript | `tauri-rust-desktop` | Context7 |
| Limpieza del repo y reubicación segura de archivos | `skillguard` | Filesystem MCP |
| GitHub Actions CI/CD | — | GitHub MCP |
| Debugging visual de UI | — | Tauri MCP |
| Docs para usuario final | `docx` / `pdf` | — |
| Tests de integración E2E | — | Playwright MCP |
| Crear nuevos skills | `skill-creator` | GitHub MCP |
 
---
 
## 6. Resumen de instalación por fases
 
### Antes de escribir la primera línea de código
```bash
# skillguard — protección al mover/borrar archivos y revisar limpiezas
npx skills add 69kingDavid69/skillguard

# Context7 — documentación actualizada
npm install -g @upstash/context7-mcp
 
# Rust MCP — toolchain Rust en Claude
cargo install rust-mcp-server
```
 
### Al arrancar la Fase 1 (MVP)
```bash
# GitHub MCP — gestión del repo
npx -y @modelcontextprotocol/server-github
 
# Tauri MCP — debugging visual
npx install-mcp @hypothesi/tauri-mcp-server --client claude-code
 
# Filesystem — lectura directa del repo
npx -y @modelcontextprotocol/server-filesystem /ruta/al/repo
```
 
### Al iniciar la Fase 2 (feature parity)
```bash
# Crates MCP — docs de crates específicos
git clone https://github.com/d6e/cratedocs-mcp.git
cd cratedocs-mcp && cargo build --release
```
 
---
 
*Skill `tauri-rust-desktop` creada para este proyecto en `/home/claude/skills/tauri-rust-desktop/SKILL.md`.*
*Skill `skillguard` instalable con `npx skills add 69kingDavid69/skillguard` para validar limpiezas, movimientos y cambios potencialmente destructivos.*
*Actualizar si se añaden nuevas dependencias al `Cargo.toml` o nuevos módulos Rust.*
