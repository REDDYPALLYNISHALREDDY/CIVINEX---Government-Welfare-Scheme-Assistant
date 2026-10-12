
export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
