from __future__ import annotations

import re

"""SpeechSegmenter (Etapa 7, seccion 18 del brief).

Auditoria previa a este modulo: la mayoria de las respuestas del Runtime ya
llegan "pre-segmentadas por fuente" - un agent.speech.segment por hallazgo
(findings.py), uno por conclusion (conclusion.py), etc. - cada uno ya una
sola oracion corta. Eso cubre el caso comun sin necesitar un segmentador de
texto.

Pero varios handlers de runtime.py SI construyen una respuesta de mas de
una oracion (ej. handle_recall_operational_context agrega "Puedo reabrir la
investigacion..." a la respuesta de memoria; handle_compare_with_memory
arma dos oraciones: "La ultima vez que revise X..." + "Estado actual: Y.").
Esos handlers truncaban el texto combinado con `[:220]`/`[:260]` caracteres
- un corte mecanico que puede caer a mitad de palabra (exactamente lo que
la seccion 18 pide evitar: "no cortar en lugares linguisticamente
absurdos"), y ademas obliga a esperar el texto completo en vez de hablar
cada oracion progresivamente (seccion 22).

Esta funcion reemplaza esa truncacion: parte el texto en oraciones reales
(nunca a mitad de palabra) y solo sub-divide una oracion individual si por
si sola supera `max_chars`, cortando en el ultimo espacio antes del limite
- nunca dentro de una palabra. Deliberadamente sin ningun conocimiento de
proveedor de voz (ElevenLabs, navegador, etc.) - solo texto en, lista de
texto out.
"""

_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")
_MIN_TRAILING_FRAGMENT_CHARS = 12


def split_for_speech(text: str, *, max_chars: int = 220) -> list[str]:
    cleaned = " ".join(text.split())
    if not cleaned:
        return []

    sentences = [s for s in _SENTENCE_BOUNDARY.split(cleaned) if s]
    segments: list[str] = []
    for sentence in sentences:
        segments.extend(_split_long_sentence(sentence, max_chars))

    # Un fragmento final muy corto (p.ej. una sola palabra que quedo sola
    # tras un split por longitud) suena abrupto en TTS - se fusiona con el
    # segmento anterior en vez de reproducirse solo.
    merged: list[str] = []
    for segment in segments:
        if merged and len(segment) < _MIN_TRAILING_FRAGMENT_CHARS:
            merged[-1] = f"{merged[-1]} {segment}"
        else:
            merged.append(segment)
    return merged


def _split_long_sentence(sentence: str, max_chars: int) -> list[str]:
    if len(sentence) <= max_chars:
        return [sentence]

    parts: list[str] = []
    remaining = sentence
    while len(remaining) > max_chars:
        cut = remaining.rfind(" ", 0, max_chars)
        if cut <= 0:
            # No hay un espacio util antes del limite (palabra unica muy
            # larga, poco realista en espanol operacional) - se corta en el
            # limite como ultimo recurso, nunca se deja crecer sin fin.
            cut = max_chars
        parts.append(remaining[:cut].strip())
        remaining = remaining[cut:].strip()
    if remaining:
        parts.append(remaining)
    return parts
