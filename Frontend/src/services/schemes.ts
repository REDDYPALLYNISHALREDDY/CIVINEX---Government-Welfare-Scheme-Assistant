
import { API_BASE_URL } from "./api";
import { getAccessToken } from "./auth";
import type {
  Scheme,
  SchemeCreateInput,
  SchemeFilters,
} from "../types/scheme";

function getErrorMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item?.msg === "string" ? item.msg : "Invalid input"
      )
      .join(", ");
  }

  return "The request could not be completed.";
}

async function handleResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body
    ) {
      message = getErrorMessage(
        (body as { detail: unknown }).detail
      );
    }

    if (response.status === 401) {
      throw new Error("Please log in to perform this action.");
    }

    if (response.status === 403) {
      throw new Error("Administrator access is required for this action.");
    }

    throw new Error(message);
  }

  return body as T;
}

export async function getSchemes(
  filters: SchemeFilters = {}
): Promise<Scheme[]> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.government_level) {
    params.set("government_level", filters.government_level);
  }

  if (filters.state?.trim()) {
    params.set("state", filters.state.trim());
  }

  const query = params.toString();
  const url = `${API_BASE_URL}/schemes/${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  return handleResponse<Scheme[]>(response);
}

export async function getSchemeById(id: number): Promise<Scheme> {
  const response = await fetch(`${API_BASE_URL}/schemes/${id}`, {
    headers: { Accept: "application/json" },
  });

  return handleResponse<Scheme>(response);
}

export async function createScheme(
  payload: SchemeCreateInput
): Promise<Scheme> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Please log in with an administrator account to create a scheme.");
  }

  const response = await fetch(`${API_BASE_URL}/schemes/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<Scheme>(response);
}



export interface SchemeDiscoveryResult {
  scheme: Scheme;
  relevance_score: number;
}

export async function discoverSchemes(
  query: string,
  filters: {
    state?: string;
    government_level?: string;
    limit?: number;
  } = {}
): Promise<SchemeDiscoveryResult[]> {
  const params = new URLSearchParams();
  params.set("query", query.trim());

  if (filters.state?.trim()) {
    params.set("state", filters.state.trim());
  }

  if (filters.government_level) {
    params.set("government_level", filters.government_level);
  }

  params.set("limit", String(filters.limit ?? 10));

  const response = await fetch(
    `${API_BASE_URL}/schemes/discover?${params.toString()}`,
    {
      headers: { Accept: "application/json" },
    }
  );

  return handleResponse<SchemeDiscoveryResult[]>(response);
}
