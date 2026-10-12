
import { API_BASE_URL } from "./api";
import type {
  LoginInput,
  RegisterInput,
  TokenResponse,
  User,
} from "../types/auth";

const TOKEN_KEY = "jansahay_access_token";
const USER_KEY = "civinex_current_user";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function getAccessToken(): string | null {
  // Migrate a token saved by the previous sessionStorage implementation.
  const savedToken = localStorage.getItem(TOKEN_KEY);

  if (savedToken) {
    return savedToken;
  }

  const oldToken = sessionStorage.getItem(TOKEN_KEY);

  if (oldToken) {
    localStorage.setItem(TOKEN_KEY, oldToken);
    sessionStorage.removeItem(TOKEN_KEY);
    return oldToken;
  }

  return null;
}

function saveAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getCachedUser(): User | null {
  const savedUser = localStorage.getItem(USER_KEY);

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as User;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function saveCachedUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function readResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body
    ) {
      const detail = (body as { detail: unknown }).detail;

      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail
          .map((item) =>
            typeof item?.msg === "string"
              ? item.msg
              : "Invalid input"
          )
          .join(", ");
      }
    }

    throw new AuthError(message, response.status);
  }

  return body as T;
}

export async function register(
  input: RegisterInput
): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return readResponse<User>(response);
}

export async function login(
  input: LoginInput
): Promise<User> {
  const form = new URLSearchParams();

  // FastAPI OAuth2PasswordRequestForm expects the email in "username".
  form.set("username", input.email);
  form.set("password", input.password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const result = await readResponse<TokenResponse>(response);
  saveAccessToken(result.access_token);

  try {
    return await getCurrentUser();
  } catch (error) {
    clearAccessToken();
    throw error;
  }
}

export async function getCurrentUser(): Promise<User> {
  const token = getAccessToken();

  if (!token) {
    throw new AuthError("You are not logged in.", 401);
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const user = await readResponse<User>(response);
  saveCachedUser(user);

  return user;
}

export function logout(): void {
  clearAccessToken();
}
