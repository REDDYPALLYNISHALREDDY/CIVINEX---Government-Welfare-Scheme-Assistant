
import { API_BASE_URL } from "./api";
import type {
  DocumentSearchRequest,
  DocumentSearchResponse,
} from "../types/search";

export async function searchDocuments(
  request: DocumentSearchRequest
): Promise<DocumentSearchResponse> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    const response = await fetch(`${API_BASE_URL}/search/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: request.query.trim(),
        scheme_id: request.scheme_id,
        limit: request.limit ?? 5,
      }),
      signal: controller.signal,
    });

    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      let message = `Search failed with status ${response.status}.`;

      if (
        data !== null &&
        typeof data === "object" &&
        "detail" in data
      ) {
        const detail = (data as { detail?: unknown }).detail;

        if (typeof detail === "string") {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail
            .map((item) =>
              typeof item?.msg === "string"
                ? item.msg
                : "Invalid request"
            )
            .join(", ");
        }
      }

      throw new Error(message);
    }

    return data as DocumentSearchResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The search took too long. Please try again."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
