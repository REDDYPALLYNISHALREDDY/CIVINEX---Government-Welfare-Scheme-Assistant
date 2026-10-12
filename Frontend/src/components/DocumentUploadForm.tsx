
import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  FiUploadCloud,
  FiFileText,
  FiX,
  FiCheckCircle,
} from "react-icons/fi";

import { getSchemes } from "../services/schemes";
import { uploadDocument } from "../services/documentUpload";
import type { Scheme } from "../types/scheme";

interface DocumentUploadFormProps {
  onUploaded: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function DocumentUploadForm({
  onUploaded,
}: DocumentUploadFormProps) {
  const { t } = useTranslation();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [schemesLoading, setSchemesLoading] = useState(true);
  const [schemesError, setSchemesError] = useState<string | null>(null);

  const [schemeId, setSchemeId] = useState("");
  const [title, setTitle] = useState("");
  const [documentVersion, setDocumentVersion] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSchemes() {
      setSchemesLoading(true);
      setSchemesError(null);

      try {
        const result = await getSchemes();

        if (!cancelled) {
          setSchemes(result);
        }
      } catch (err) {
        if (!cancelled) {
          setSchemesError(
            err instanceof Error
              ? err.message
              : t("documentUpload.unableToLoadSchemes")
          );
        }
      } finally {
        if (!cancelled) {
          setSchemesLoading(false);
        }
      }
    }

    void loadSchemes();

    return () => {
      cancelled = true;
    };
  }, [t]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);

    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      event.target.value = "";
      setError(t("documentUpload.pdfOnly"));
      return;
    }

    if (
      selectedFile.type &&
      !["application/pdf", "application/octet-stream"].includes(
        selectedFile.type
      )
    ) {
      setFile(null);
      event.target.value = "";
      setError(t("documentUpload.invalidPdfType"));
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      event.target.value = "";
      setError(t("documentUpload.fileTooLarge"));
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!schemeId) {
      setError(t("documentUpload.selectSchemeError"));
      return;
    }

    if (!file) {
      setError(t("documentUpload.choosePdfError"));
      return;
    }

    setSubmitting(true);

    try {
      const uploaded = await uploadDocument({
        schemeId: Number(schemeId),
        title: title.trim() || undefined,
        documentVersion: documentVersion.trim() || undefined,
        file,
      });

      setSuccess(
        t("documentUpload.uploadSuccess", { title: uploaded.title })
      );

      setTitle("");
      setDocumentVersion("");
      setFile(null);

      const fileInput = document.getElementById(
        "document-pdf-file"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      onUploaded();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("documentUpload.uploadFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="upload-panel">
      <div className="upload-panel-heading">
        <div className="upload-heading-icon">
          <FiUploadCloud />
        </div>

        <div>
          <h3>{t("documentUpload.title")}</h3>
          <p>{t("documentUpload.description")}</p>
        </div>
      </div>

      {schemesError && (
        <div className="upload-alert upload-alert-error" role="alert">
          <p>{schemesError}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => window.location.reload()}
          >
            {t("documentUpload.reloadPage")}
          </button>
        </div>
      )}

      {!schemesLoading &&
        !schemesError &&
        schemes.length === 0 && (
          <div className="upload-alert upload-alert-info">
            {t("documentUpload.addSchemeFirst")}
          </div>
        )}

      <form className="document-upload-form" onSubmit={handleSubmit}>
        <div className="upload-form-field">
          <label htmlFor="document-scheme">
            {t("documentUpload.governmentScheme")} *
          </label>

          <select
            id="document-scheme"
            value={schemeId}
            onChange={(event) => setSchemeId(event.target.value)}
            disabled={
              schemesLoading || schemes.length === 0 || submitting
            }
            required
          >
            <option value="">
              {schemesLoading
                ? t("documentUpload.loadingSchemes")
                : t("documentUpload.selectScheme")}
            </option>

            {schemes.map((scheme) => (
              <option key={scheme.id} value={scheme.id}>
                {scheme.name}
                {scheme.scheme_code ? ` (${scheme.scheme_code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="upload-form-grid">
          <div className="upload-form-field">
            <label htmlFor="document-title">
              {t("documentUpload.documentTitle")}
            </label>

            <input
              id="document-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("documentUpload.titlePlaceholder")}
              maxLength={255}
              disabled={submitting}
            />

            <span className="field-help">
              {t("documentUpload.titleHelp")}
            </span>
          </div>

          <div className="upload-form-field">
            <label htmlFor="document-version">
              {t("documentUpload.documentVersion")}
            </label>

            <input
              id="document-version"
              type="text"
              value={documentVersion}
              onChange={(event) => setDocumentVersion(event.target.value)}
              placeholder={t("documentUpload.versionPlaceholder")}
              maxLength={100}
              disabled={submitting}
            />

            <span className="field-help">
              {t("documentUpload.versionHelp")}
            </span>
          </div>
        </div>

        <div className="upload-form-field">
          <label htmlFor="document-pdf-file">
            {t("documentUpload.pdfFile")} *
          </label>

          <label
            className={`upload-dropzone ${file ? "has-file" : ""}`}
            htmlFor="document-pdf-file"
          >
            {file ? <FiFileText /> : <FiUploadCloud />}

            <span className="upload-dropzone-title">
              {file
                ? file.name
                : t("documentUpload.choosePdf")}
            </span>

            <span className="upload-dropzone-description">
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                : t("documentUpload.pdfLimit")}
            </span>

            <span className="upload-select-label">
              {file
                ? t("documentUpload.chooseAnotherFile")
                : t("documentUpload.browseFiles")}
            </span>
          </label>

          <input
            id="document-pdf-file"
            className="visually-hidden-file-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={submitting}
            required={!file}
          />
        </div>

        {error && (
          <div className="upload-alert upload-alert-error" role="alert">
            <p>{error}</p>

            {file && (
              <button
                type="button"
                className="dismiss-alert-button"
                aria-label={t("documentUpload.dismissError")}
                onClick={() => setError(null)}
              >
                <FiX />
              </button>
            )}
          </div>
        )}

        {success && (
          <div className="upload-alert upload-alert-success" role="status">
            <FiCheckCircle />
            <p>{success}</p>
          </div>
        )}

        <div className="upload-form-footer">
          <p>{t("documentUpload.footerNote")}</p>

          <button
            type="submit"
            className="primary-button upload-submit-button"
            disabled={
              submitting ||
              schemesLoading ||
              schemes.length === 0 ||
              !schemeId ||
              !file
            }
          >
            <FiUploadCloud />
            {submitting
              ? t("documentUpload.uploading")
              : t("documentUpload.uploadButton")}
          </button>
        </div>
      </form>
    </section>
  );
}
