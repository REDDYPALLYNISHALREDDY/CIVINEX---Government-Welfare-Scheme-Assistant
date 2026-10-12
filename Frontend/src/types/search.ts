
export interface DocumentSearchRequest {
  query: string;
  scheme_id?: number;
  limit?: number;
}

export interface RetrievedChunk {
  document_id: number;
  scheme_id: number;
  chunk_index: number;
  text: string;
  score: number;
}

export interface DocumentSearchResponse {
  query: string;
  results: RetrievedChunk[];
  total_results: number;
}
