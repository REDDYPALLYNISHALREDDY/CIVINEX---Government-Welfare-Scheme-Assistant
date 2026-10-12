
import { API_BASE_URL } from "./api";
import { getAccessToken } from "./auth";

export type ApplicationStatus =
  | "planning"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "withdrawn";

export interface TrackedApplication {
  id: number;
  user_id: number;
  scheme_id: number;
  reference_number: string | null;
  application_date: string | null;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackedApplicationInput {
  scheme_id: number;
  reference_number: string | null;
  application_date: string | null;
  status: ApplicationStatus;
  notes: string | null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Please log in to manage application records.");
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

export function getTrackedApplications(): Promise<TrackedApplication[]> {
  return request<TrackedApplication[]>("/applications/");
}

export function createTrackedApplication(
  input: TrackedApplicationInput,
): Promise<TrackedApplication> {
  return request<TrackedApplication>("/applications/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTrackedApplication(
  id: number,
  input: Omit<TrackedApplicationInput, "scheme_id">,
): Promise<TrackedApplication> {
  return request<TrackedApplication>(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteTrackedApplication(id: number): Promise<void> {
  return request<void>(`/applications/${id}`, {
    method: "DELETE",
  });
}
