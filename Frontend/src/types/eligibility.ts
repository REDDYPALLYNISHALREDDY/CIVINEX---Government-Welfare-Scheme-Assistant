
export interface CitizenProfile {
  age?: number;
  state?: string;
  annual_income?: number;
}

export interface EligibilityCheckRequest {
  scheme_id: number;
  profile: CitizenProfile;
}

export type EligibilityStatus =
  | "potentially_eligible"
  | "not_eligible"
  | "needs_more_information";

export interface EligibilityCheckResponse {
  scheme_id: number;
  scheme_name: string;
  status: EligibilityStatus;
  reasons: string[];
  missing_fields: string[];
  disclaimer: string;
}
