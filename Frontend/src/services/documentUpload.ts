
import type { SchemeDocument } from "../types/document";
import { getAccessToken } from "./auth";
import { API_BASE_URL } from "./api";

export interface DocumentUploadInput {
  schemeId: number;
  title?: string;
  documentVersion?: string;
  file: File;
}

export async function uploadDocument(
  input: DocumentUploadInput,
): Promise<SchemeDocument> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Please log in before uploading a document.");
  }

  const formData = new FormData();

  formData.append("scheme_id", String(input.schemeId));
  formData.append("file", input.file);

  if (input.title?.trim()) {
    formData.append("title", input.title.trim());
  }

  if (input.documentVersion?.trim()) {
    formData.append("document_version", input.documentVersion.trim());
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("The upload timed out. Please try again.");
    }

    throw new Error(
      "Cannot connect to the backend. Check that the FastAPI server is running.",
    );
  }

  if (!response.ok) {
    let message = `Upload failed with status ${response.status}.`;

    try {
      const body: unknown = await response.json();

      if (
        typeof body === "object" &&
        body !== null &&
        "detail" in body
      ) {
        const detail = (body as { detail: unknown }).detail;

        if (typeof detail === "string") {
          message = detail;
        }
      }
    } catch {
      // Keep the HTTP status message if the response isn't JSON.
    }

    if (response.status === 401) {
      throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error("Administrator access is required to upload documents.");
    }

    throw new Error(message);
  }

  try {
    return (await response.json()) as SchemeDocument;
  } catch {
    throw new Error("The server returned an invalid upload response.");
  }
}
