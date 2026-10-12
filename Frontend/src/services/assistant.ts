
import { API_BASE_URL } from "./api";
import type {
  AssistantAnswer,
  AssistantQuestion,
} from "../types/assistant";

export async function askAssistant(
  request: AssistantQuestion
): Promise<AssistantAnswer> {
  const controller = new AbortController();

  // Local model inference can take longer than ordinary API requests.
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch(`${API_BASE_URL}/assistant/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: request.question.trim(),
        scheme_id: request.scheme_id,
        language: request.language,
      }),
      signal: controller.signal,
    });

    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      let message = `Assistant request failed (${response.status}).`;

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

    return data as AssistantAnswer;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The AI response took too long. Please try again."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
