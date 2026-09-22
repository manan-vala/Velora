"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchSession, login, logout, signup, type Credentials, type User } from "@/lib/auth";
import { useAppStore } from "@/store/useAppStore";
import { useMobileStore } from "@/store/useMobileStore";

export const SESSION_KEY = ["session"] as const;

export function useSession() {
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    isAuthenticated: !!query.data,
  };
}

function useStartSession(action: (credentials: Credentials) => Promise<User>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (user) => queryClient.setQueryData(SESSION_KEY, user),
  });
}

export const useLogin = () => useStartSession(login);
export const useSignup = () => useStartSession(signup);

export function useLogout() {
  const queryClient = useQueryClient();
  const clearDesktop = useAppStore((state) => state.clearOptimization);
  const clearMobile = useMobileStore((state) => state.clearOptimization);

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Never leave one user's routes on screen for the next one.
      clearDesktop();
      clearMobile();
      queryClient.setQueryData(SESSION_KEY, null);
      queryClient.clear();
    },
  });
}
