
import { API_BASE_URL } from "./api";
import type {
  EligibilityCheckRequest,
  EligibilityCheckResponse,
} from "../types/eligibility";

export async function checkEligibility(
  request: EligibilityCheckRequest
): Promise<EligibilityCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/eligibility/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    let message = `Eligibility check failed (${response.status}).`;

    if (
      data !== null &&
      typeof data === "object" &&
      "detail" in data &&
      typeof data.detail === "string"
    ) {
      message = data.detail;
    }

    throw new Error(message);
  }

  return data as EligibilityCheckResponse;
}
