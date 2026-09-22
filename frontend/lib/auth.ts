import { apiFetch, apiJson, storeToken } from "./client";

export interface User {
  username: string;
  isAdmin: boolean;
}

interface SessionResponse {
  user: { username: string; is_admin: boolean };
  expiresAt: string;
  token?: string; // app build only: no cross-site cookie to rely on
}

export interface Credentials {
  username: string;
  password: string;
}

function toUser(user: { username: string; is_admin: boolean }): User {
  return { username: user.username, isAdmin: user.is_admin };
}

export async function login(credentials: Credentials): Promise<User> {
  const session = await apiJson<SessionResponse>("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (session.token) storeToken(session.token);
  return toUser(session.user);
}

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
    const { user } = await apiJson<{ user: { username: string; is_admin: boolean } }>("/auth/me");
    return toUser(user);
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      storeToken(null);
      return null;
    }
    throw error;
  }
}
