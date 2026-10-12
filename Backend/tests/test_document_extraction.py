
import pymupdf
import pytest

from app.services.document_extraction_service import (
    PDFExtractionError,
    extract_pdf_text,
)


def create_text_pdf(path, text="JanSahay test document"):
    pdf = pymupdf.open()

    page = pdf.new_page()
    page.insert_text((72, 72), text)

    pdf.save(path)
    pdf.close()


def test_extract_text_from_pdf(tmp_path):
    pdf_path = tmp_path / "scheme.pdf"
    create_text_pdf(pdf_path, "Eligibility criteria for applicants")

    result = extract_pdf_text(pdf_path)

    assert "Eligibility criteria for applicants" in result
    assert "[Page 1]" in result


def test_extract_empty_pdf(tmp_path):
    pdf_path = tmp_path / "empty.pdf"

    pdf = pymupdf.open()
    pdf.new_page()
    pdf.save(pdf_path)
    pdf.close()

    result = extract_pdf_text(pdf_path)

    assert result == ""


def test_missing_pdf_raises_error(tmp_path):
    pdf_path = tmp_path / "missing.pdf"

    with pytest.raises(PDFExtractionError):
        extract_pdf_text(pdf_path)


def test_invalid_pdf_raises_error(tmp_path):
    pdf_path = tmp_path / "invalid.pdf"
    pdf_path.write_text("This is not a PDF", encoding="utf-8")

    with pytest.raises(PDFExtractionError):
        extract_pdf_text(pdf_path)
