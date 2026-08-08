from app.ai.runtime.speech_segmenter import split_for_speech

"""Etapa 7, seccion 18 y priority 1 de la auditoria de gaps: SpeechSegmenter
no existia como modulo separado - la mayoria de respuestas ya llegaban
pre-segmentadas por fuente (un agent.speech.segment por hallazgo/conclusion,
cada uno ya una sola oracion), pero varios handlers de runtime.py armaban
texto de mas de una oracion y lo truncaban con `[:220]`/`[:260]` caracteres,
un corte mecanico que puede caer a mitad de palabra. Este modulo lo
reemplaza; estos tests cubren su logica pura, sin WebSocket ni sesion."""


def test_texto_corto_es_un_solo_segmento():
    assert split_for_speech("La producción está en línea con el plan.") == ["La producción está en línea con el plan."]


def test_texto_vacio_no_genera_segmentos():
    assert split_for_speech("") == []
    assert split_for_speech("   ") == []


def test_parte_en_oraciones_naturales_no_a_mitad_de_palabra():
    text = (
        "La producción de Pala 03 cayó 8,4% durante las últimas dos horas. "
        "La principal desviación está en el tiempo de carga. "
        "Estoy verificando si coincide con demoras de transporte."
    )
    segments = split_for_speech(text, max_chars=220)
    assert segments == [
        "La producción de Pala 03 cayó 8,4% durante las últimas dos horas.",
        "La principal desviación está en el tiempo de carga.",
        "Estoy verificando si coincide con demoras de transporte.",
    ]
    # Ninguna oracion quedo cortada a mitad de palabra: cada segmento termina
    # en puntuacion de cierre real.
    assert all(s[-1] in ".!?" for s in segments)


def test_replica_el_caso_real_de_handle_compare_with_memory():
    text = (
        "La última vez que revisé Pala 03 (2026-08-05T10:00:00Z), rendimiento bajo el plan. "
        "Estado actual: worsening."
    )
    segments = split_for_speech(text, max_chars=260)
    assert len(segments) == 2
    assert segments[0].startswith("La última vez que revisé Pala 03")
    assert segments[1] == "Estado actual: worsening."


def test_oracion_individual_mas_larga_que_el_limite_se_corta_en_un_espacio():
    long_sentence = "Encontré una desviación significativa en el rendimiento de carguío de la unidad " + ("muy " * 30) + "por debajo del plan operacional establecido para este turno."
    segments = split_for_speech(long_sentence, max_chars=80)
    assert len(segments) > 1
    for segment in segments:
        assert len(segment) <= 80 or " " not in segment  # solo excede si es una palabra sola sin espacio donde cortar
        # nunca empieza o termina a mitad de una palabra pegada a otra sin espacio de por medio
        assert not segment.startswith(" ")
        assert not segment.endswith(" ")


def test_fragmento_final_muy_corto_se_fusiona_con_el_anterior():
    # Una oracion larga cuyo ultimo pedazo, tras cortar por longitud, quedaria
    # como una palabra sola - no debe reproducirse como su propio segmento.
    text = "Palabra " * 20 + "final"
    segments = split_for_speech(text.strip(), max_chars=50)
    assert all(len(s) >= 12 for s in segments)


def test_normaliza_espacios_repetidos_sin_alterar_el_contenido():
    segments = split_for_speech("Hola   mundo.  \n\n  Segunda oración.")
    assert segments == ["Hola mundo.", "Segunda oración."]


def test_signos_de_interrogacion_y_exclamacion_tambien_cierran_oracion():
    segments = split_for_speech("¿Qué estoy viendo? Te muestro el resumen. ¡Atención con esa alerta!")
    assert segments == ["¿Qué estoy viendo?", "Te muestro el resumen.", "¡Atención con esa alerta!"]
