
import type { HealthResponse } from "../types/health";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

export async function getBackendHealth(): Promise<HealthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}`);
    }

    return (await response.json()) as HealthResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}


export async function apiRequest<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("The request timed out. Check the backend and try again.");
    }

    throw new Error(
      "Cannot reach the backend. Make sure the FastAPI server is running.",
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

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
      // Retain the HTTP status message when the response is not JSON.
    }

    throw new Error(message);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("The backend returned an invalid JSON response.");
  }
}