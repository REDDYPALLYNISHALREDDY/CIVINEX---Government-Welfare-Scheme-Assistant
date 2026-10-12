
export interface SchemeDocument {
  id: number;
  scheme_id: number;
  uploaded_by_user_id: number | null;
  title: string;
  original_filename: string;
  source_url: string | null;
  document_version: string | null;
  processing_status: string;
  created_at: string;
}
