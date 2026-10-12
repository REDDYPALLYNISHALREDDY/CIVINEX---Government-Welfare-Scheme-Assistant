
import type { SchemeDocument } from "../types/document";
import { API_BASE_URL } from "./api";
import { getAccessToken } from "./auth";

export async function getDocuments(
  schemeId?: number,
): Promise<SchemeDocument[]> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Please log in to view document records.");
  }

  const params = new URLSearchParams();

  if (schemeId !== undefined) {
    params.set("scheme_id", String(schemeId));
  }

  const query = params.toString();
  const url = `${API_BASE_URL}/documents/${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error("You do not have permission to view these documents.");
  }

  if (!response.ok) {
    throw new Error(
      `Unable to load documents (HTTP ${response.status}).`,
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("The document API returned an unexpected response.");
  }

  return data as SchemeDocument[];
}
