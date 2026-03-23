# Release Checklist

## Estado actual

El proyecto ya puede compilarse como app macOS nativa desde Xcode y distribuirse fuera de la Mac App Store como `.app` o `.dmg`.

La build actual ya incluye:

- UI SwiftUI con importacion manual de bibliotecas XML desde toolbar, menu, sidebar y ajustes.
- Persistencia del XML activo y lista corta de XML recientes.
- Token `ARL` guardado en Keychain.
- Dependencias Python vendorizadas dentro del bundle.
- Bridge Swift ↔ Python con reinicio automatico al iniciar descargas.
- Backend con deduplicacion global en SQLite y organizacion por playlist.

## Checklist para distribucion fuera de App Store

Antes de publicar a usuarios finales, conviene cerrar estos puntos:

1. Firma la app con `Developer ID Application`.
2. Notariza el `.app` o `.dmg` con Apple.
3. Embebe un interprete Python dentro del bundle para no depender de `python3` del sistema.
4. Prueba en un Mac limpio:
   - importacion de XML
   - guardado y lectura de `ARL`
   - descarga real FLAC/MP3 320
   - reintentos, pausa, reanudacion y cancelacion
   - permisos de acceso a carpetas
5. Incrementa `CFBundleShortVersionString` y `CFBundleVersion` antes de cada release.
6. Define un flujo de actualizaciones si vas a distribuir varias versiones.
7. Añade un proceso de QA sobre playlists grandes, playlists con duplicados y nombres con caracteres especiales.

## App Store

Con la arquitectura actual no debe considerarse lista para la Mac App Store.

Motivos principales:

- El flujo depende de una credencial de sesion de Deezer (`ARL`) capturada desde la web.
- La descarga usa una integracion no oficial con Deezer.
- La app se apoya en un bridge Python embebido para una funcionalidad principal.

Si mas adelante quieres intentar App Store, el camino razonable es rediseñar esta parte:

1. Sustituir la autenticacion basada en `ARL` por una integracion oficialmente autorizada por el proveedor de musica.
2. Limitar la app a APIs y permisos compatibles con las App Review Guidelines.
3. Mantener la lectura de playlists con MusicKit o con importacion de XML del usuario, pero separar eso del motor de descarga no oficial.
4. Revisar sandboxing, firma, entitlements y privacidad como una app macOS de distribucion Apple.

Referencia oficial:

- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
