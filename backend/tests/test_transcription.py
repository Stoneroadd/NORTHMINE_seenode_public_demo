from __future__ import annotations

import asyncio
import subprocess
from dataclasses import replace

import pytest

from app.ai import transcription
from app.ai.transcription import TranscriptionFailed, TranscriptionResult
from app.core.config import get_settings


def test_windows_language_is_normalized_and_restricted():
    assert transcription._normalized_windows_language("es", "es-ES") == "es-ES"
    assert transcription._normalized_windows_language("es-cl", "es-ES") == "es-CL"
    assert transcription._normalized_windows_language("; Remove-Item", "es-ES") == "es-ES"


def test_windows_speech_uses_argument_list_and_removes_temporary_audio(monkeypatch):
    settings = replace(get_settings(), windows_speech_enabled=True)
    captured: dict[str, object] = {}

    def fake_run(command, **kwargs):
        captured["command"] = command
        captured["kwargs"] = kwargs
        audio_path = command[command.index("-AudioPath") + 1]
        captured["audio_path"] = audio_path
        assert transcription.Path(audio_path).is_file()
        return subprocess.CompletedProcess(command, 0, stdout="Genera el reporte", stderr="")

    monkeypatch.setattr(transcription.subprocess, "run", fake_run)
    result = transcription._transcribe_with_windows_speech(
        settings=settings,
        audio=b"RIFF-test",
        language="es-CL",
    )

    assert result == TranscriptionResult(
        text="Genera el reporte",
        provider="windows_speech",
        model=f"windows-speech-{settings.windows_speech_language}",
    )
    assert isinstance(captured["command"], list)
    assert not transcription.Path(str(captured["audio_path"])).exists()


def test_windows_speech_timeout_is_reported(monkeypatch):
    settings = replace(get_settings(), windows_speech_enabled=True)

    def fake_run(command, **_kwargs):
        raise subprocess.TimeoutExpired(command, 1)

    monkeypatch.setattr(transcription.subprocess, "run", fake_run)
    with pytest.raises(TranscriptionFailed, match="tiempo permitido"):
        transcription._transcribe_with_windows_speech(
            settings=settings,
            audio=b"RIFF-test",
            language="es-ES",
        )


def test_wav_uses_windows_recognition_when_vosk_is_unavailable(monkeypatch):
    settings = replace(get_settings(), openai_api_key="", windows_speech_enabled=True)
    expected = TranscriptionResult("Hola JARVIS", "windows_speech", "windows-speech-es-ES")
    monkeypatch.setattr(transcription, "vosk_speech_available", lambda _settings: False)
    monkeypatch.setattr(transcription, "windows_speech_available", lambda _settings: True)
    monkeypatch.setattr(transcription, "_transcribe_with_windows_speech", lambda **_kwargs: expected)

    result = asyncio.run(
        transcription.transcribe_audio(
            settings=settings,
            audio=b"RIFF-test",
            content_type="audio/wav",
            language="es-ES",
        )
    )

    assert result == expected


def test_transcription_provider_prefers_offline_vosk(monkeypatch):
    settings = replace(get_settings(), vosk_speech_enabled=True)
    monkeypatch.setattr(transcription, "vosk_speech_available", lambda _settings: True)

    assert transcription.transcription_provider(settings) == (
        "vosk_local",
        transcription.Path(settings.vosk_model_path).name,
    )
