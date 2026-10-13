
export type AssistantLanguage = "en" | "te" | "hi" | "ta";

export interface AssistantQuestion {
  question: string;
  scheme_id?: number;
  language: AssistantLanguage;
}

export interface AssistantSource {
  document_id: number;
  scheme_id: number;
  scheme_name: string;
  document_title: string;
  official_url: string | null;
  chunk_indexes: number[];
  relevance_score: number;
}


export interface AssistantSchemeMatch {
  scheme_id: number;
  scheme_name: string;
  description: string | null;
  benefits: string | null;
  official_url: string | null;
  relevance_score: number;
}


export interface AssistantAnswer {
  question: string;
  answer: string;
  sources: AssistantSource[];
  scheme_matches: AssistantSchemeMatch[];
  grounded: boolean;
}
