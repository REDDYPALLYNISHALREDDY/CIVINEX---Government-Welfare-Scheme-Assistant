
export interface Scheme {
  id: number;
  name: string;
  scheme_code: string | null;
  description: string | null;
  government_level: string;
  state: string | null;
  category: string | null;
  official_url: string | null;
  eligibility_rules: Record<string, unknown> | null;
  benefits: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchemeFilters {
  search?: string;
  government_level?: string;
  state?: string;
}



export interface SchemeCreateInput {
  name: string;
  scheme_code?: string | null;
  description?: string | null;
  government_level: "central" | "state";
  state?: string | null;
  category?: string | null;
  official_url?: string | null;
  eligibility_rules: Record<string, unknown>;
  benefits?: string | null;
}
