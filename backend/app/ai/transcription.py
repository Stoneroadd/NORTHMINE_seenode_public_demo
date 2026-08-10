from __future__ import annotations

import asyncio
import importlib.util
import io
import json
import logging
import re
import subprocess
import sys
import tempfile
import wave
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import httpx

from app.core.config import Settings

OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions"
WINDOWS_SPEECH_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "transcribe_windows_speech.ps1"
SUPPORTED_AUDIO_TYPES = frozenset(
    {
        "audio/webm",
        "audio/ogg",
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
        "audio/mp4",
        "audio/flac",
    }
)

logger = logging.getLogger("northmine.ai.transcription")


@dataclass(frozen=True)
class TranscriptionResult:
    text: str
    provider: str
    model: str


class TranscriptionUnavailable(RuntimeError):
    """No hay un proveedor de transcripcion configurado en el servidor."""


class TranscriptionFailed(RuntimeError):
    """El proveedor configurado no pudo transcribir el audio."""


@lru_cache(maxsize=4)
def _windows_speech_engine_available(language: str) -> bool:
    try:
        completed = subprocess.run(
            [
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(WINDOWS_SPEECH_SCRIPT),
                "-Language",
                language,
                "-Probe",
            ],
            capture_output=True,
            timeout=8,
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        return completed.returncode == 0 and completed.stdout.strip() == b"available"
    except (OSError, subprocess.TimeoutExpired):
        return False


def windows_speech_available(settings: Settings) -> bool:
    return (
        settings.speech_transcription_enabled
        and settings.windows_speech_enabled
        and sys.platform == "win32"
        and WINDOWS_SPEECH_SCRIPT.is_file()
        and _windows_speech_engine_available(settings.windows_speech_language)
    )


def vosk_speech_available(settings: Settings) -> bool:
    model_path = Path(settings.vosk_model_path)
    return (
        settings.speech_transcription_enabled
        and settings.vosk_speech_enabled
        and importlib.util.find_spec("vosk") is not None
        and model_path.is_dir()
        and (model_path / "conf" / "model.conf").is_file()
    )


def transcription_provider(settings: Settings) -> tuple[str, str] | None:
    if vosk_speech_available(settings):
        return "vosk_local", Path(settings.vosk_model_path).name
    if windows_speech_available(settings):
        return "windows_speech", f"windows-speech-{settings.windows_speech_language}"
    if settings.speech_transcription_enabled and settings.openai_api_key:
        return "openai", settings.speech_transcription_model
    return None


@lru_cache(maxsize=2)
def _load_vosk_model(model_path: str):
    import vosk

    vosk.SetLogLevel(-1)
    return vosk.Model(model_path)


def _transcribe_with_vosk(*, settings: Settings, audio: bytes) -> TranscriptionResult:
    try:
        import vosk

        with wave.open(io.BytesIO(audio), "rb") as wav_file:
            if (
                wav_file.getnchannels() != 1
                or wav_file.getsampwidth() != 2
                or wav_file.getcomptype() != "NONE"
            ):
                raise TranscriptionFailed("El audio local debe ser WAV PCM mono de 16 bits")
            model = _load_vosk_model(settings.vosk_model_path)
            recognizer = vosk.KaldiRecognizer(model, wav_file.getframerate())
            while True:
                chunk = wav_file.readframes(4000)
                if not chunk:
                    break
                recognizer.AcceptWaveform(chunk)
            result = json.loads(recognizer.FinalResult())
    except (EOFError, wave.Error, json.JSONDecodeError) as exc:
        raise TranscriptionFailed("El audio WAV recibido no es valido") from exc
    except OSError as exc:
        raise TranscriptionFailed("El modelo local de voz no pudo abrirse") from exc

    text = str(result.get("text") or "").strip()
    if not text:
        raise TranscriptionFailed("No se detecto voz en la grabacion")
    return TranscriptionResult(
        text=text,
        provider="vosk_local",
        model=Path(settings.vosk_model_path).name,
    )


def _normalized_windows_language(language: str, fallback: str) -> str:
    candidate = language.strip().replace("_", "-")
    if re.fullmatch(r"[a-zA-Z]{2}(?:-[a-zA-Z]{2})?", candidate):
        if "-" not in candidate:
            candidate = f"{candidate}-ES" if candidate.lower() == "es" else fallback
        language_code, region_code = candidate.split("-", 1)
        return f"{language_code.lower()}-{region_code.upper()}"
    return fallback


def _transcribe_with_windows_speech(
    *, settings: Settings, audio: bytes, language: str
) -> TranscriptionResult:
    audio_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as audio_file:
            audio_file.write(audio)
            audio_path = Path(audio_file.name)

        command = [
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(WINDOWS_SPEECH_SCRIPT),
            "-AudioPath",
            str(audio_path),
            "-Language",
            _normalized_windows_language(language, settings.windows_speech_language),
        ]
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=settings.windows_speech_timeout_seconds,
            check=False,
            creationflags=creationflags,
        )
        text = completed.stdout.strip().lstrip("\ufeff")
        if completed.returncode != 0:
            raise TranscriptionFailed("El reconocimiento local de Windows no pudo procesar el audio")
        if not text:
            raise TranscriptionFailed("No se detecto voz en la grabacion")
        return TranscriptionResult(
            text=text,
            provider="windows_speech",
            model=f"windows-speech-{settings.windows_speech_language}",
        )
    except subprocess.TimeoutExpired as exc:
        raise TranscriptionFailed("El reconocimiento local excedio el tiempo permitido") from exc
    except OSError as exc:
        raise TranscriptionFailed("El reconocimiento local de Windows no esta disponible") from exc
    finally:
        if audio_path is not None:
            audio_path.unlink(missing_ok=True)


async def _transcribe_with_openai(
    *, settings: Settings, audio: bytes, media_type: str, extension: str, language: str
) -> TranscriptionResult:
    try:
        async with httpx.AsyncClient(timeout=settings.speech_transcription_timeout_seconds) as client:
            response = await client.post(
                OPENAI_TRANSCRIPTIONS_URL,
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                data={
                    "model": settings.speech_transcription_model,
                    "language": language[:2].lower(),
                    "response_format": "json",
                    "prompt": "NORTHMINE, mineria, produccion, turno, flota, CAEX, pala, carguio, WENCO.",
                },
                files={"file": (f"jarvis.{extension}", audio, media_type)},
            )
    except httpx.HTTPError as exc:
        raise TranscriptionFailed("No fue posible conectar con el proveedor de transcripcion") from exc

    if response.status_code >= 400:
        logger.warning("OpenAI transcription failed status=%s", response.status_code)
        raise TranscriptionFailed(f"El proveedor de transcripcion respondio con estado {response.status_code}")

    try:
        text = str(response.json().get("text") or "").strip()
    except (TypeError, ValueError) as exc:
        raise TranscriptionFailed("Respuesta de transcripcion invalida") from exc
    if not text:
        raise TranscriptionFailed("No se detecto voz en la grabacion")
    return TranscriptionResult(text=text, provider="openai", model=settings.speech_transcription_model)


async def transcribe_audio(
    *,
    settings: Settings,
    audio: bytes,
    content_type: str,
    language: str = "es",
) -> TranscriptionResult:
    if not settings.speech_transcription_enabled:
        raise TranscriptionUnavailable("Transcripcion de voz no configurada")

    media_type = content_type.split(";", 1)[0].strip().lower()
    if media_type not in SUPPORTED_AUDIO_TYPES:
        raise ValueError("Formato de audio no soportado")

    if media_type in {"audio/wav", "audio/x-wav"} and vosk_speech_available(settings):
        try:
            return await asyncio.to_thread(_transcribe_with_vosk, settings=settings, audio=audio)
        except TranscriptionFailed:
            if not windows_speech_available(settings) and not settings.openai_api_key:
                raise

    if media_type in {"audio/wav", "audio/x-wav"} and windows_speech_available(settings):
        try:
            return await asyncio.to_thread(
                _transcribe_with_windows_speech,
                settings=settings,
                audio=audio,
                language=language,
            )
        except TranscriptionFailed:
            if not settings.openai_api_key:
                raise

    if not settings.openai_api_key:
        raise TranscriptionUnavailable("Transcripcion de voz no configurada para este formato")

    extension = {
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/mpeg": "mp3",
        "audio/mp4": "mp4",
        "audio/flac": "flac",
    }[media_type]
    return await _transcribe_with_openai(
        settings=settings,
        audio=audio,
        media_type=media_type,
        extension=extension,
        language=language,
    )
