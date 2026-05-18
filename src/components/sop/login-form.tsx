"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, LogIn, Mail } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api";
import { storeSession } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const session = await login(email, password);
      storeSession(session);
      const redirect =
        new URLSearchParams(window.location.search).get("redirect") ||
        "/dashboard";
      router.push(redirect.startsWith("/") ? redirect : "/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Login failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="relative isolate grid min-h-[calc(100vh-4rem)] w-full max-w-none items-center gap-4 overflow-hidden px-4 py-0 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-100"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.14),_transparent_34%),radial-gradient(circle_at_75%_25%,_rgba(244,121,32,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_30%),linear-gradient(135deg,_#050505_0%,_#090909_48%,_#120b06_100%)]" />
          <div className="absolute left-[8%] top-[16%] h-[26rem] w-[26rem] rounded-full bg-sky-500/12 blur-3xl" />
          <div className="absolute right-[12%] top-[18%] h-[24rem] w-[24rem] rounded-full bg-orange-500/18 blur-3xl" />
          <div className="absolute bottom-[10%] left-[7%] h-[16rem] w-[16rem] rounded-full bg-slate-900/70 blur-3xl" />
          <div className="absolute right-[10%] bottom-[12%] h-[20rem] w-[20rem] rounded-full bg-slate-800/60 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] opacity-10" />
        </div>

        <section className="relative z-10 hidden gap-4 lg:grid">
          <Button asChild variant="ghost" className="w-fit">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Library
            </Link>
          </Button>
          <div className="grid gap-4">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#cf5f0d] dark:text-orange-300">
              SOP Studio
            </p>
            <h1
              className="max-w-2xl text-5xl font-black leading-[1.05] tracking-normal text-white drop-shadow-[0_4px_22px_rgba(0,0,0,0.9)]"
              style={{ textShadow: "0 4px 28px rgba(0,0,0,0.95)" }}
            >
              Sign in to manage procedures, categories, and publishing.
            </h1>
            <p
              className="max-w-xl text-base leading-7 text-slate-200 drop-shadow-[0_2px_16px_rgba(0,0,0,0.8)]"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.85)" }}
            >
              Authentication uses the existing FastAPI login route and keeps the returned session locally for the admin workspace.
            </p>
          </div>
        </section>

        <form
          onSubmit={onSubmit}
          className="relative z-10 grid gap-5 rounded-3xl border border-white/10 bg-[#101010]/68 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <div className="grid gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#f47920] text-white">
              <LogIn className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black tracking-normal text-slate-950 dark:text-white">
              Admin login
            </h2>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Email
            <span className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pl-9"
                autoComplete="email"
                required
              />
            </span>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Password
            <span className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-9"
                autoComplete="current-password"
                required
              />
            </span>
          </label>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign in
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
