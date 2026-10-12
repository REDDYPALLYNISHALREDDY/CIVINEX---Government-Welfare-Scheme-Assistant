
import { API_BASE_URL } from "./api";
import { getAccessToken } from "./auth";

export interface SavedScheme {
  id: number;
  scheme_id: number;
  created_at: string;
  name: string;
  scheme_code: string | null;
  description: string | null;
  government_level: string;
  state: string | null;
  category: string | null;
  official_url: string | null;
  benefits: string | null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Please log in to manage saved schemes.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    let message = `Request failed (HTTP ${response.status}).`;

    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      message = body.detail;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getSavedSchemes(): Promise<SavedScheme[]> {
  return request<SavedScheme[]>("/saved-schemes/");
}

export function saveScheme(schemeId: number): Promise<SavedScheme> {
  return request<SavedScheme>("/saved-schemes/", {
    method: "POST",
    body: JSON.stringify({ scheme_id: schemeId }),
  });
}

export function removeSavedScheme(schemeId: number): Promise<void> {
  return request<void>(`/saved-schemes/${schemeId}`, {
    method: "DELETE",
  });
}
