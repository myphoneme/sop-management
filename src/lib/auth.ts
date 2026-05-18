"use client";

import type { LoginResponse } from "@/lib/types";

const SESSION_KEY = "sop_studio_session";

export type StoredSession = {
  token: string;
  tokenType: string;
  user: LoginResponse["user"];
};

export function storeSession(response: LoginResponse) {
  const session: StoredSession = {
    token: response.access_token,
    tokenType: response.token_type,
    user: response.user,
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function loginPath(redirectTo = "/dashboard") {
  return `/login?redirect=${encodeURIComponent(redirectTo)}`;
}
