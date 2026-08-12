from __future__ import annotations

from typing import Literal

from app.ai.runtime import speech_segmenter

SpeechKind = Literal["STATUS", "FINDING", "WARNING", "RESULT", "QUESTION"]

_MAX_SENTENCES: dict[SpeechKind, int] = {
    "STATUS": 1,
    "FINDING": 2,
    "WARNING": 1,
    "RESULT": 2,
    "QUESTION": 1,
}


def kind_for_priority(priority: str) -> SpeechKind:
    return {
        "status": "STATUS",
        "finding": "FINDING",
        "warning": "WARNING",
        "result": "RESULT",
        "question": "QUESTION",
    }.get(priority.lower(), "STATUS")


def spoken_chunks(text: str, kind: SpeechKind) -> list[str]:
    """Resume para voz sin alterar el detalle visual ni leer tablas completas."""
    if not text.strip() or "|---" in text:
        return []
    chunks = speech_segmenter.split_for_speech(text)
    return chunks[:_MAX_SENTENCES[kind]]
