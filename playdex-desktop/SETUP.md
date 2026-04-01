# Configuración del entorno de desarrollo PlayDex Desktop

Esta guía cubre el subproyecto `playdex-desktop/`, la extensión Windows/Linux de PlayDex basada en Tauri v2 + React + Rust.

## 1. Requisitos del sistema

### Node.js y npm

Usa una versión LTS reciente de Node.js.

```bash
node --version
npm --version
```

### Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo --version
```

### Python 3

El engine se ejecuta con `python3`. Las dependencias de Python van vendorizadas en `src-tauri/resources/engine/vendor/`, así que no hace falta un `pip install` global para el flujo normal.

```bash
python3 --version
```

## 2. Instalación del proyecto

```bash
cd playdex-desktop
npm ci
```

## 3. Verificación rápida

```bash
cd playdex-desktop
npm run check
```

Este comando:

- compila el frontend con Vite,
- valida el backend Rust,
- y ejecuta la prueba del parser CSV.

## 4. Desarrollo local

### App completa con Tauri

```bash
cd playdex-desktop
npm run tauri:dev
```

### Solo frontend

```bash
cd playdex-desktop
npm run dev
```

### Información del entorno Tauri

```bash
cd playdex-desktop
npm run tauri:info
```

## 5. Build local

El build local solo genera artefactos del sistema operativo host.

```bash
cd playdex-desktop
npm run tauri:build
```

En este repo, los instaladores reales de Windows y Linux se generan desde GitHub Actions, no desde cross-compile manual dentro del proyecto principal.

## 6. Releases para GitHub

El workflow de release queda configurado en:

```text
.github/workflows/playdex-desktop-release.yml
```

Para generar assets de Windows y Linux:

```bash
git tag playdex-desktop-v0.1.0
git push origin playdex-desktop-v0.1.0
```

Ese push dispara el build en runners nativos de GitHub y crea un draft release con los binarios soportados por Tauri para Windows y Linux.
El workflow vuelve a instalar el vendor Python del engine en cada runner para evitar arrastrar binarios compilados desde macOS.

## 7. CI para pull requests

La validación automática del subproyecto queda en:

```text
.github/workflows/playdex-desktop-ci.yml
```

Se ejecuta en Windows y Ubuntu para comprobar que `npm run check` siga pasando antes de publicar.

## 8. Skills y MCPs recomendados

Sigue la guía detallada en [`SkillsMcpWinLin.md`](SkillsMcpWinLin.md).

### Skill recomendada

```bash
npx skills add 69kingDavid69/skillguard
```

## 9. Troubleshooting

### Error "python3 not found"

Asegúrate de que `python3` esté disponible en `PATH`.

### Error al empaquetar en Linux

En runners Ubuntu o entornos Linux locales, Tauri necesita librerías del sistema como `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev` y `patchelf`.

### Error al crear releases en GitHub

El workflow necesita permisos de escritura sobre `contents`. Si GitHub muestra `Resource not accessible by integration`, habilita permisos de lectura y escritura para Actions en el repositorio.

---

Para más detalles, consulta [`README.md`](README.md), [`ArquitecturaWinLin.md`](ArquitecturaWinLin.md) y [`SkillsMcpWinLin.md`](SkillsMcpWinLin.md).
