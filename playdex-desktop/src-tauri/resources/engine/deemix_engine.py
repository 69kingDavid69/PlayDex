#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import sqlite3
import sys
import unicodedata
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

SCRIPT_ROOT = Path(__file__).resolve().parent
VENDOR_PATH = SCRIPT_ROOT / "vendor"
if VENDOR_PATH.is_dir():
    sys.path.insert(0, str(VENDOR_PATH))


DEFAULT_CONFIG_PATH = Path.home() / ".deemix-itunes" / "config.json"
CONFIG_PATH = Path(os.environ.get("DEEMIX_ITUNES_CONFIG_PATH", str(DEFAULT_CONFIG_PATH)))
CONFIG_ROOT = CONFIG_PATH.parent
DB_PATH = Path(os.environ.get("DEEMIX_ITUNES_DB_PATH", str(CONFIG_ROOT / "db.sqlite")))


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKC", value).strip().casefold()


def sanitize_folder_name(name: str) -> str:
    name = unicodedata.normalize("NFC", name)
    name = name.replace("/", " - ").replace("\\", " - ")
    name = re.sub(r'[:\*\?"<>\|]', "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name[:200] or "Playlist"


def sanitize_file_component(name: str) -> str:
    name = unicodedata.normalize("NFC", name)
    name = name.replace("/", " - ").replace("\\", " - ")
    name = re.sub(r'[:\*\?"<>\|]', "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name[:180] or "Unknown"


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def format_path_error(action: str, path: Path, exc: Exception) -> str:
    return f"{action} en {path}: {exc}"


def resolve_output_path(root: Path, playlist_name: str, track: "TrackPayload", audio_format: str) -> Path:
    playlist_folder = root / sanitize_folder_name(playlist_name)
    ensure_directory(playlist_folder)

    extension = "flac" if audio_format == "FLAC" else "mp3"
    filename = f"{sanitize_file_component(track.artist)} - {sanitize_file_component(track.title)}.{extension}"
    candidate = playlist_folder / filename

    if not candidate.exists():
        return candidate

    stem = candidate.stem
    suffix = candidate.suffix
    counter = 2
    while True:
        numbered = playlist_folder / f"{stem}_{counter}{suffix}"
        if not numbered.exists():
            return numbered
        counter += 1


def connect_db() -> sqlite3.Connection:
    ensure_directory(DB_PATH.parent)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with connect_db() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS downloaded_tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deezer_id TEXT UNIQUE,
                isrc TEXT,
                artist TEXT NOT NULL,
                title TEXT NOT NULL,
                album TEXT,
                audio_format TEXT NOT NULL,
                file_path TEXT NOT NULL,
                playlist_name TEXT NOT NULL,
                downloaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_deezer_id ON downloaded_tracks(deezer_id);
            CREATE INDEX IF NOT EXISTS idx_isrc ON downloaded_tracks(isrc);
            CREATE INDEX IF NOT EXISTS idx_artist_title ON downloaded_tracks(artist, title);
            """
        )


def is_already_downloaded(
    deezer_id: str | None,
    isrc: str | None,
    artist: str,
    title: str,
) -> dict[str, Any] | None:
    with connect_db() as connection:
        row: sqlite3.Row | None = None

        if deezer_id:
            row = connection.execute(
                "SELECT * FROM downloaded_tracks WHERE deezer_id = ?",
                (deezer_id,),
            ).fetchone()

        if row is None and isrc:
            row = connection.execute(
                "SELECT * FROM downloaded_tracks WHERE isrc = ?",
                (isrc,),
            ).fetchone()

        if row is None:
            row = connection.execute(
                """
                SELECT * FROM downloaded_tracks
                WHERE lower(trim(artist)) = lower(trim(?))
                  AND lower(trim(title)) = lower(trim(?))
                LIMIT 1
                """,
                (artist, title),
            ).fetchone()

        if row is None:
            return None

        record = dict(row)
        file_path = Path(record["file_path"])
        if not file_path.exists():
            connection.execute(
                "DELETE FROM downloaded_tracks WHERE id = ?",
                (record["id"],),
            )
            return None

        return record


def register_download(track_meta: dict[str, Any], file_path: str, playlist_name: str) -> None:
    with connect_db() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO downloaded_tracks
            (deezer_id, isrc, artist, title, album, audio_format, file_path, playlist_name, downloaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                track_meta.get("deezer_id"),
                track_meta.get("isrc"),
                track_meta["artist"],
                track_meta["title"],
                track_meta.get("album"),
                track_meta["audio_format"],
                file_path,
                playlist_name,
            ),
        )


def ensure_visual_index_link(download_root: Path) -> None:
    ensure_directory(download_root)
    link_path = download_root / "_index.db"
    if link_path.exists() or link_path.is_symlink():
        return

    try:
        link_path.symlink_to(DB_PATH)
    except OSError:
        pass


@dataclass
class EngineConfig:
    download_location: str
    preferred_format: str
    fallback_chain: list[str]
    reject_below: str | None
    parallel_downloads: int
    retry_count: int
    arl_token: str

    @property
    def download_root(self) -> Path:
        return Path(os.path.expanduser(self.download_location))


@dataclass
class TrackPayload:
    artist: str
    title: str
    album: str | None = None
    isrc: str | None = None
    deezer_id: str | None = None

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "TrackPayload":
        return cls(
            artist=str(payload.get("artist") or "Unknown Artist"),
            title=str(payload.get("title") or "Unknown Title"),
            album=payload.get("album"),
            isrc=payload.get("isrc"),
            deezer_id=payload.get("deezer_id"),
        )

    def event_payload(self) -> dict[str, str]:
        return {
            "artist": self.artist,
            "title": self.title,
        }


@dataclass
class PlaylistPayload:
    name: str
    tracks: list[TrackPayload]

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "PlaylistPayload":
        return cls(
            name=str(payload.get("name") or "Playlist"),
            tracks=[TrackPayload.from_dict(item) for item in payload.get("tracks", [])],
        )


@dataclass
class RuntimeState:
    pause_gate: asyncio.Event
    cancel_requested: bool = False

    @classmethod
    def create(cls) -> "RuntimeState":
        gate = asyncio.Event()
        gate.set()
        return cls(pause_gate=gate)


class DependencyNotAvailable(RuntimeError):
    pass


class EngineProgressListener:
    def __init__(
        self,
        track: TrackPayload,
        on_progress: Callable[[int, float | None, int | None], None] | None = None,
    ) -> None:
        self.track = track
        self.on_progress = on_progress

    def send(self, key: str, value: dict[str, Any] | None = None) -> None:
        if key != "updateQueue" or self.on_progress is None or not value:
            return

        progress_value = value.get("progress")
        if progress_value is None:
            return

        try:
            percent = int(float(progress_value))
        except (TypeError, ValueError):
            return

        self.on_progress(percent, None, None)


class DeemixAdapter:
    def __init__(self, config: EngineConfig) -> None:
        self.config = config
        self.import_error: Exception | None = None
        self.deezer_cls = None
        self.track_formats = None
        self.generate_track_item = None
        self.downloader_cls = None
        self.settings_defaults = None
        self.overwrite_option = None
        self.dz = None
        self.logged_arl: str | None = None

        try:
            from deezer import Deezer, TrackFormats
            from deemix.downloader import Downloader
            from deemix.itemgen import generateTrackItem
            from deemix.settings import DEFAULTS, OverwriteOption

            self.deezer_cls = Deezer
            self.track_formats = TrackFormats
            self.generate_track_item = generateTrackItem
            self.downloader_cls = Downloader
            self.settings_defaults = DEFAULTS
            self.overwrite_option = OverwriteOption
        except Exception as exc:
            self.import_error = exc

    @property
    def module_available(self) -> bool:
        return self.import_error is None

    @property
    def is_ready(self) -> bool:
        return self.module_available and bool(self.config.arl_token)

    def ensure_logged_in(self) -> None:
        if self.import_error is not None:
            raise DependencyNotAvailable(
                f"deemix no está disponible en este entorno: {self.import_error}"
            )

        if not self.config.arl_token:
            raise DependencyNotAvailable("Falta el token ARL para autenticar la sesión de Deezer.")

        if self.dz is None:
            self.dz = self.deezer_cls()

        if self.logged_arl == self.config.arl_token and getattr(self.dz, "logged_in", False):
            return

        if not self.dz.login_via_arl(self.config.arl_token):
            raise DependencyNotAvailable("El token ARL de Deezer es inválido o expiró.")

        self.logged_arl = self.config.arl_token

    def preferred_bitrate(self) -> Any:
        for candidate in self.config.fallback_chain:
            if candidate == "FLAC":
                return self.track_formats.FLAC
            if candidate == "MP3_320":
                return self.track_formats.MP3_320
        raise ValueError("No hay formatos válidos configurados en fallback_chain.")

    def build_deemix_settings(self, output_folder: Path) -> dict[str, Any]:
        settings = deepcopy(self.settings_defaults)
        settings["downloadLocation"] = str(output_folder)
        settings["tracknameTemplate"] = "%artist% - %title%"
        settings["albumTracknameTemplate"] = "%artist% - %title%"
        settings["playlistTracknameTemplate"] = "%artist% - %title%"
        settings["createPlaylistFolder"] = False
        settings["createArtistFolder"] = False
        settings["createAlbumFolder"] = False
        settings["createCDFolder"] = False
        settings["createSingleFolder"] = False
        settings["createStructurePlaylist"] = False
        settings["padTracks"] = False
        settings["queueConcurrency"] = 1
        settings["maxBitrate"] = str(self.preferred_bitrate())
        settings["fallbackBitrate"] = len(self.config.fallback_chain) > 1
        settings["fallbackSearch"] = True
        settings["fallbackISRC"] = True
        settings["saveArtwork"] = False
        settings["saveArtworkArtist"] = False
        settings["createM3U8File"] = False
        settings["logErrors"] = False
        settings["logSearched"] = False
        settings["executeCommand"] = ""
        settings["overwriteFile"] = self.overwrite_option.KEEP_BOTH
        return settings

    def resolve_deezer_track_id(self, track: TrackPayload) -> str:
        if track.deezer_id:
            return str(track.deezer_id)

        if track.isrc:
            try:
                isrc_track = self.dz.api.get_track_by_ISRC(track.isrc)
                if isinstance(isrc_track, dict) and isrc_track.get("id"):
                    return str(isrc_track["id"])
            except Exception:
                pass

        track_id = self.dz.api.get_track_id_from_metadata(
            track.artist,
            track.title,
            track.album or "",
        )
        if str(track_id) != "0":
            return str(track_id)

        search_response = self.dz.api.search_track(f"{track.artist} {track.title}", limit=1)
        if search_response.get("data"):
            return str(search_response["data"][0]["id"])

        raise ValueError(f"No se encontró '{track.artist} - {track.title}' en Deezer.")

    def download_track(
        self,
        track: TrackPayload,
        playlist_name: str,
        on_progress: Callable[[int, float | None, int | None], None] | None = None,
    ) -> dict[str, Any]:
        self.ensure_logged_in()

        playlist_folder = self.config.download_root / sanitize_folder_name(playlist_name)
        ensure_directory(playlist_folder)

        deemix_settings = self.build_deemix_settings(playlist_folder)
        deezer_track_id = self.resolve_deezer_track_id(track)
        download_object = self.generate_track_item(self.dz, deezer_track_id, self.preferred_bitrate())
        listener = EngineProgressListener(track, on_progress)

        self.downloader_cls(self.dz, download_object, deemix_settings, listener).start()

        if not download_object.files:
            if download_object.errors:
                raise ValueError(download_object.errors[0].get("message") or "La descarga falló en deemix.")
            raise ValueError("deemix no produjo ningún archivo para esta canción.")

        source_path = Path(download_object.files[0]["path"])
        if not source_path.exists():
            raise FileNotFoundError(f"El archivo descargado no apareció en {source_path}.")

        audio_format = "FLAC" if source_path.suffix.lower() == ".flac" else "MP3_320"
        target_path = resolve_output_path(self.config.download_root, playlist_name, track, audio_format)

        if source_path != target_path:
            ensure_directory(target_path.parent)
            shutil.move(str(source_path), str(target_path))
            source_path = target_path

        track_api = download_object.single.get("trackAPI") or {}
        track_meta = {
            "deezer_id": str(track_api.get("id") or deezer_track_id),
            "isrc": track_api.get("isrc") or track.isrc,
            "artist": ((track_api.get("artist") or {}).get("name")) or track.artist,
            "title": track_api.get("title") or track.title,
            "album": ((track_api.get("album") or {}).get("title")) or track.album,
            "audio_format": audio_format,
        }

        return {
            "file_path": source_path,
            "audio_format": audio_format,
            "file_size_mb": round(source_path.stat().st_size / (1024 * 1024), 2),
            "track_meta": track_meta,
        }


def load_config() -> EngineConfig:
    config_path = CONFIG_PATH
    ensure_directory(config_path.parent)

    data: dict[str, Any] = {}
    if config_path.exists():
        with config_path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    else:
        data = {
            "downloadLocation": "~/Music/Deemix",
            "quality": {
                "preferred": "FLAC",
                "fallback_chain": ["FLAC", "MP3_320"],
                "reject_below": "MP3_320",
            },
            "parallelDownloads": 3,
            "retryCount": 2,
        }
        with config_path.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=2, ensure_ascii=False)

    quality = data.get("quality", {})
    preferred = str(quality.get("preferred") or "FLAC")
    fallback_chain = [str(item) for item in quality.get("fallback_chain", [preferred, "MP3_320"])]

    if preferred not in fallback_chain:
        fallback_chain.insert(0, preferred)

    return EngineConfig(
        download_location=str(data.get("downloadLocation") or "~/Music/Deemix"),
        preferred_format=preferred,
        fallback_chain=fallback_chain,
        reject_below=quality.get("reject_below"),
        parallel_downloads=int(data.get("parallelDownloads") or 3),
        retry_count=int(data.get("retryCount") or 2),
        arl_token=os.environ.get("DEEMIX_ITUNES_ARL", ""),
    )


def preferred_audio_format(config: EngineConfig) -> str:
    for candidate in config.fallback_chain:
        if candidate in {"FLAC", "MP3_320"}:
            return candidate
    raise ValueError("No hay formatos válidos configurados en fallback_chain.")


async def download_playlist(
    payload: PlaylistPayload,
    config: EngineConfig,
    runtime: RuntimeState,
    adapter: DeemixAdapter,
) -> None:
    stats = {
        "completed": 0,
        "skipped": 0,
        "errors": 0,
    }
    database_available = True

    try:
        initialize_database()
    except Exception as exc:
        database_available = False
        emit(
            {
                "event": "bridge_error",
                "error_code": "DATABASE_UNAVAILABLE",
                "message": format_path_error(
                    "No se pudo preparar la base de duplicados",
                    DB_PATH,
                    exc,
                ),
            }
        )

    try:
        ensure_directory(config.download_root)
        ensure_visual_index_link(config.download_root)
    except Exception as exc:
        message = format_path_error(
            "No se pudo preparar la carpeta de descargas",
            config.download_root,
            exc,
        )

        for track in payload.tracks:
            emit(
                {
                    "event": "error",
                    "track": track.event_payload(),
                    "error_code": "OUTPUT_DIRECTORY_UNAVAILABLE",
                    "message": message,
                }
            )
            stats["errors"] += 1

        emit(
            {
                "event": "bridge_error",
                "error_code": "OUTPUT_DIRECTORY_UNAVAILABLE",
                "message": message,
            }
        )
        emit(
            {
                "event": "playlist_done",
                "playlist": payload.name,
                "stats": stats,
            }
        )
        runtime.cancel_requested = False
        return

    for track in payload.tracks:
        if runtime.cancel_requested:
            break

        await runtime.pause_gate.wait()

        try:
            existing = None
            if database_available:
                existing = is_already_downloaded(track.deezer_id, track.isrc, track.artist, track.title)

            if existing is not None:
                emit(
                    {
                        "event": "skipped",
                        "reason": "already_downloaded",
                        "track": track.event_payload(),
                        "existing_file": existing["file_path"],
                        "existing_playlist": existing["playlist_name"],
                    }
                )
                stats["skipped"] += 1
                continue

            def forward_progress(
                percent: int,
                speed_kbps: float | None,
                eta_seconds: int | None,
            ) -> None:
                payload: dict[str, Any] = {
                    "event": "progress",
                    "track": track.event_payload(),
                    "percent": percent,
                }
                if speed_kbps is not None:
                    payload["speed_kbps"] = speed_kbps
                if eta_seconds is not None:
                    payload["eta_seconds"] = eta_seconds
                emit(payload)

            result = await asyncio.to_thread(
                adapter.download_track,
                track,
                payload.name,
                forward_progress,
            )

            file_path = str(result["file_path"])
            if database_available:
                register_download(result["track_meta"], file_path, payload.name)

            emit(
                {
                    "event": "completed",
                    "track": track.event_payload(),
                    "file_path": file_path,
                    "audio_format": result["audio_format"],
                    "file_size_mb": result.get("file_size_mb"),
                }
            )
            stats["completed"] += 1

        except DependencyNotAvailable as exc:
            emit(
                {
                    "event": "error",
                    "track": track.event_payload(),
                    "error_code": "DEEMIX_NOT_AVAILABLE",
                    "message": str(exc),
                }
            )
            stats["errors"] += 1

        except NotImplementedError as exc:
            emit(
                {
                    "event": "error",
                    "track": track.event_payload(),
                    "error_code": "DEEMIX_INTEGRATION_PENDING",
                    "message": str(exc),
                }
            )
            stats["errors"] += 1

        except Exception as exc:  # pragma: no cover - defensive bridge path
            emit(
                {
                    "event": "error",
                    "track": track.event_payload(),
                    "error_code": "DOWNLOAD_FAILED",
                    "message": str(exc),
                }
            )
            stats["errors"] += 1

    emit(
        {
            "event": "playlist_done",
            "playlist": payload.name,
            "stats": stats,
        }
    )
    runtime.cancel_requested = False


async def handle_command(
    command: dict[str, Any],
    config: EngineConfig,
    runtime: RuntimeState,
    adapter: DeemixAdapter,
    active_download: dict[str, asyncio.Task[None] | None],
) -> None:
    command_name = command.get("command")

    if command_name == "download_playlist":
        if active_download["task"] is not None and not active_download["task"].done():
            emit(
                {
                    "event": "bridge_error",
                    "message": "Ya existe una playlist en curso. Espera a que termine o cancélala.",
                }
            )
            return

        payload = PlaylistPayload.from_dict(command.get("playlist") or {})
        runtime.cancel_requested = False
        runtime.pause_gate.set()
        active_download["task"] = asyncio.create_task(download_playlist(payload, config, runtime, adapter))
        return

    if command_name == "pause":
        runtime.pause_gate.clear()
        return

    if command_name == "resume":
        runtime.pause_gate.set()
        return

    if command_name == "cancel":
        runtime.cancel_requested = True
        runtime.pause_gate.set()
        emit({
            "event": "bridge_error",
            "error_code": "CANCELLED",
            "message": "Descarga cancelada por el usuario",
        })
        return

    emit(
        {
            "event": "bridge_error",
            "message": f"Comando desconocido: {command_name}",
        }
    )


async def stdin_loop() -> None:
    config = load_config()
    runtime = RuntimeState.create()
    adapter = DeemixAdapter(config)
    active_download: dict[str, asyncio.Task[None] | None] = {"task": None}

    emit(
        {
            "event": "bridge_ready",
            "deemix_available": adapter.module_available,
            "download_ready": adapter.is_ready,
            "arl_present": bool(config.arl_token),
        }
    )

    while True:
        line = await asyncio.to_thread(sys.stdin.readline)
        if not line:
            task = active_download["task"]
            if task is not None:
                await task
            return

        line = line.strip()
        if not line:
            continue

        try:
            command = json.loads(line)
        except json.JSONDecodeError as exc:
            emit(
                {
                    "event": "bridge_error",
                    "message": f"JSON inválido recibido por stdin: {exc}",
                }
            )
            continue

        await handle_command(command, config, runtime, adapter, active_download)


def main() -> None:
    try:
        asyncio.run(stdin_loop())
    except KeyboardInterrupt:
        return
    except Exception as exc:
        emit(
            {
                "event": "bridge_error",
                "error_code": "BRIDGE_STARTUP_FAILED",
                "message": str(exc),
            }
        )
        raise SystemExit(1)


if __name__ == "__main__":
    main()
