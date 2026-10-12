
from pathlib import Path

import pymupdf


class PDFExtractionError(Exception):
    """Raised when a PDF cannot be opened or processed."""


def extract_pdf_text(pdf_path: str | Path) -> str:
    """
    Extract text from a PDF file.

    Returns the extracted text. An empty string means that no usable
    text was found; the PDF may be scanned or contain only images.
    """
    path = Path(pdf_path)

    if not path.is_file():
        raise PDFExtractionError("The stored PDF file does not exist.")

    try:
        extracted_pages: list[str] = []

        with pymupdf.open(path) as pdf:
            if pdf.is_encrypted:
                raise PDFExtractionError(
                    "Password-protected PDFs are not supported."
                )

            for page_number, page in enumerate(pdf, start=1):
                page_text = page.get_text("text").strip()

                if page_text:
                    extracted_pages.append(
                        f"[Page {page_number}]\n{page_text}"
                    )

        return "\n\n".join(extracted_pages).strip()

    except PDFExtractionError:
        raise
    except Exception as exc:
        raise PDFExtractionError(
            "The PDF could not be read or processed."
        ) from exc
