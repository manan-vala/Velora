"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, KeyRound, Loader2, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { FormError } from "@/components/auth/form-parts";
import { Badge } from "@/components/map/ui/badge";
import { Button } from "@/components/map/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/map/ui/card";
import { Input } from "@/components/map/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/map/ui/table";
import { useSession } from "@/hooks/useSession";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  resetAccountPassword,
  setAccountAccess,
  type Account,
  type AccountWithPassword,
} from "@/lib/admin";

const ACCOUNTS_KEY = ["admin", "accounts"] as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function NewPasswordNotice({ account, onDismiss }: { account: AccountWithPassword; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account.password);
      setCopied(true);
    } catch {
      setCopied(false); // clipboard blocked; the password is on screen to copy by hand
    }
  };

  return (
    <Card className="border-primary/30 bg-secondary/40 gap-3">
      <CardHeader className="gap-1">
        <CardTitle className="text-sm">Password for {account.username}</CardTitle>
        <CardDescription className="text-sm">
          Copy it now and pass it on — it can&apos;t be shown again. Generate a new one any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <code className="bg-background border-border flex-1 rounded-md border px-3 py-2 font-mono text-sm break-all">
          {account.password}
        </code>
        <Button type="button" size="lg" onClick={copy} className="h-9 text-sm">
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={onDismiss} className="h-9 text-sm">
          Done
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AccountsDashboard() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [issued, setIssued] = useState<AccountWithPassword | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const accounts = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: listAccounts });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });

  const create = useMutation({
    mutationFn: createAccount,
    onSuccess: (account) => {
      setIssued(account);
      setUsername("");
      refresh();
    },
  });
  const resetPassword = useMutation({
    mutationFn: resetAccountPassword,
    onSuccess: (account) => {
      setIssued(account);
      refresh();
    },
  });
  const access = useMutation({
    mutationFn: ({ name, active }: { name: string; active: boolean }) => setAccountAccess(name, active),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      setPendingDelete(null);
      refresh();
    },
  });

  const busy = create.isPending || resetPassword.isPending || access.isPending || remove.isPending;
  const error = accounts.error ?? create.error ?? resetPassword.error ?? access.error ?? remove.error;

  return (
    <div className="auth-theme min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">User accounts</h1>
            <p className="text-muted-foreground text-sm">
              Only people with an account here can sign in. Signed in as {user?.username}.
            </p>
          </div>
          <Link
            href="/visualiser"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" /> Back to app
          </Link>
        </div>

        <FormError error={error} />
        {issued && <NewPasswordNotice account={issued} onDismiss={() => setIssued(null)} />}

        <Card className="gap-4">
          <CardHeader className="gap-1">
            <CardTitle className="text-sm">Add a user</CardTitle>
            <CardDescription className="text-sm">
              We generate the password and show it to you once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const name = username.trim().toLowerCase();
                if (name && !create.isPending) create.mutate(name);
              }}
            >
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="username"
                aria-label="New username"
                autoCapitalize="none"
                spellCheck={false}
                className="h-9 max-w-xs text-sm"
              />
              <Button type="submit" size="lg" disabled={!username.trim() || create.isPending} className="h-9 text-sm">
                {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                Add user
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          {accounts.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 px-4 py-6 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading accounts…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.data?.map((account: Account) => {
                  const isSelf = account.username === user?.username;
                  return (
                    <TableRow key={account.username}>
                      <TableCell className="font-medium">
                        {account.username}
                        {account.is_admin && (
                          <Badge variant="secondary" className="ml-2">
                            admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.is_active ? "secondary" : "destructive"}>
                          {account.is_active ? "active" : "revoked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(account.last_login_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => resetPassword.mutate(account.username)}
                          >
                            <KeyRound /> New password
                          </Button>
                          {!isSelf && (
                            <Button
                              type="button"
                              size="sm"
                              variant={account.is_active ? "ghost" : "secondary"}
                              disabled={busy}
                              onClick={() =>
                                access.mutate({ name: account.username, active: !account.is_active })
                              }
                            >
                              {account.is_active ? <UserMinus /> : <UserPlus />}
                              {account.is_active ? "Revoke" : "Restore"}
                            </Button>
                          )}
                          {!isSelf &&
                            (pendingDelete === account.username ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  disabled={busy}
                                  onClick={() => remove.mutate(account.username)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPendingDelete(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={busy}
                                onClick={() => setPendingDelete(account.username)}
                              >
                                <Trash2 /> Delete
                              </Button>
                            ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        <p className="text-muted-foreground text-xs">
          Revoking takes effect immediately: the user is signed out on their next request and can&apos;t sign in
          again until you restore them. Deleting removes the account for good.
        </p>
      </div>
    </div>
  );
}
