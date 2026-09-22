import { apiFetch, apiJson, storeToken } from "./client";

export interface User {
  username: string;
}

interface SessionResponse {
  user: User;
  expiresAt: string;
  token?: string; // app build only: no cross-site cookie to rely on
}

export interface Credentials {
  username: string;
  password: string;
}

async function startSession(path: "/auth/login" | "/auth/signup", credentials: Credentials): Promise<User> {
  const session = await apiJson<SessionResponse>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (session.token) storeToken(session.token);
  return session.user;
}

export const login = (credentials: Credentials) => startSession("/auth/login", credentials);
export const signup = (credentials: Credentials) => startSession("/auth/signup", credentials);

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    storeToken(null);
  }
}

/** The signed-in user, or null when there is no valid session. */
export async function fetchSession(): Promise<User | null> {
  try {
    const { user } = await apiJson<{ user: User }>("/auth/me");
    return user;
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      storeToken(null);
      return null;
    }
    throw error;
  }
}
