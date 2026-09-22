import { apiFetch, apiJson } from "./client";

export interface Account {
  username: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
}

/** Only returned when a password is generated; the server can't show it again. */
export interface AccountWithPassword extends Account {
  password: string;
}

export const listAccounts = () => apiJson<Account[]>("/admin/users");

export const createAccount = (username: string) =>
  apiJson<AccountWithPassword>("/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username }),
  });

export const resetAccountPassword = (username: string) =>
  apiJson<AccountWithPassword>(`/admin/users/${encodeURIComponent(username)}/password`, { method: "POST" });

export const setAccountAccess = (username: string, active: boolean) =>
  apiJson<Account>(`/admin/users/${encodeURIComponent(username)}/${active ? "restore" : "revoke"}`, {
    method: "POST",
  });

export const deleteAccount = async (username: string) => {
  await apiFetch(`/admin/users/${encodeURIComponent(username)}`, { method: "DELETE" });
};
