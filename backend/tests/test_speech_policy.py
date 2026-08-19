from app.ai.runtime.speech_policy import spoken_chunks


def test_status_is_one_sentence_and_result_is_brief():
    text = "Primera señal. Segunda señal. Tercera señal."
    assert len(spoken_chunks(text, "STATUS")) == 1
    assert len(spoken_chunks(text, "RESULT")) == 2


def test_tables_are_never_read_aloud():
    assert spoken_chunks("Equipo | Real\n---|---\nPala 03 | 91", "RESULT") == []
