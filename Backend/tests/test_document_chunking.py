
import pytest

from app.services.document_chunking_service import chunk_document_text


def test_empty_text_returns_no_chunks():
    assert chunk_document_text("") == []
    assert chunk_document_text("   \n  ") == []


def test_short_text_creates_one_chunk():
    result = chunk_document_text("Government scheme guidelines.")

    assert len(result) == 1
    assert result[0].index == 0
    assert result[0].text == "Government scheme guidelines."


def test_long_text_creates_overlapping_chunks():
    text = "A" * 2500

    result = chunk_document_text(
        text,
        chunk_size=1000,
        overlap=200,
    )

    assert len(result) == 3
    assert result[0].index == 0
    assert result[1].index == 1
    assert result[2].index == 2

    # Each full chunk is limited to the configured size.
    assert all(len(chunk.text) <= 1000 for chunk in result)

    # The second chunk overlaps the first by 200 characters.
    assert result[0].text[-200:] == result[1].text[:200]


def test_invalid_chunk_size_is_rejected():
    with pytest.raises(ValueError):
        chunk_document_text("Test", chunk_size=0)


def test_overlap_must_be_smaller_than_chunk_size():
    with pytest.raises(ValueError):
        chunk_document_text(
            "Test",
            chunk_size=100,
            overlap=100,
        )


def test_chunk_indexes_are_sequential():
    result = chunk_document_text(
        "Government welfare scheme information " * 100,
        chunk_size=100,
        overlap=20,
    )

    assert [chunk.index for chunk in result] == list(range(len(result)))
