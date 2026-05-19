"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Search,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getUsers } from "@/lib/api";
import { getCurrentSession, loginPath } from "@/lib/auth";
import type { ApiUser } from "@/lib/types";
import { initials } from "@/lib/utils";

export function UserManager() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [query, setQuery] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      getCurrentSession().then((storedSession) => {
        if (!active) return;

        if (!storedSession) {
          navigate(loginPath(pathname || "/dashboard/users"), { replace: true });
          return;
        }

        setSessionChecked(true);
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [navigate, pathname]);

  useEffect(() => {
    if (!sessionChecked) {
      return;
    }

    let active = true;

    async function load() {
      try {
        setLoading(true);
        const userData = await getUsers();

        if (active) {
          setUsers(userData);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Unable to load users.";
          setError(message);
          showToast({
            tone: "error",
            title: "Users could not be loaded",
            description: message,
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [sessionChecked, showToast]);

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return users;
    }

    return users.filter((user) =>
      `${user.name} ${user.email}`.toLowerCase().includes(normalized),
    );
  }, [query, users]);

  return (
    <AppShell variant="dashboard">
      <div className="grid gap-6">
        {!sessionChecked ? (
          <div className="grid min-h-96 place-items-center rounded-lg border border-orange-100 bg-white dark:border-[#242424] dark:bg-[#101010]">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button asChild variant="ghost">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            </div>

            <header className="grid gap-3">
              <h1 className="text-3xl font-black tracking-normal text-slate-950 dark:text-white sm:text-4xl">
                User management
              </h1>
            </header>

            <section className="rounded-lg border border-orange-100 bg-white shadow-sm dark:border-[#242424] dark:bg-[#101010]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 p-4 dark:border-[#f47920]/20">
                <div>
                  <h2 className="text-base font-black tracking-normal text-slate-950 dark:text-white">
                    User list
                  </h2>
                  <p className="text-sm font-semibold text-slate-500">
                    {visibleUsers.length} visible
                  </p>
                </div>
                <label className="relative w-full sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="pl-9"
                    placeholder="Search users"
                  />
                </label>
              </div>

              {error ? (
                <div className="m-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div className="grid min-h-64 place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : visibleUsers.length === 0 ? (
                <div className="grid min-h-64 place-items-center p-8 text-center">
                  <div className="grid gap-3">
                    <h3 className="text-xl font-black tracking-normal text-slate-950 dark:text-white">
                      No users found
                    </h3>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-orange-50 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-[#f47920]/10">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {visibleUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-200">
                                {user.profile_picture ? (
                                  <UserRound className="h-4 w-4" />
                                ) : (
                                  initials(user.name)
                                )}
                              </span>
                              <span className="font-black text-slate-950 dark:text-white">
                                {user.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                              <Mail className="h-4 w-4" />
                              {user.email}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-500">
                            #{user.id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
