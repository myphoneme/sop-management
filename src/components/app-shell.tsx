"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpenCheck,
  FilePlus2,
  FolderKanban,
  LayoutDashboard,
  Library,
  LogIn,
  LogOut,
  Moon,
  PencilLine,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearSession, getCurrentSession, isAdminSession, loginPath, type StoredSession } from "@/lib/auth";
import { resolveAssetUrl } from "@/lib/api";
import { cn, initials } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  variant?: "public" | "dashboard";
};

const dashboardLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/sops/mine", label: "Your SOPs", icon: BookOpenCheck },
  { href: "/dashboard/sops", label: "All SOPs", icon: BookOpenCheck, adminOnly: true },
  { href: "/dashboard/sops/new", label: "Create SOP", icon: FilePlus2 },
  { href: "/dashboard/categories", label: "Categories", icon: FolderKanban },
  { href: "/dashboard/users", label: "Users", icon: UsersRound, adminOnly: true },
];

export function AppShell({ children, variant = "public" }: AppShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      getCurrentSession().then((currentSession) => {
        if (active) {
          setSession(currentSession);
        }
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const dashboardHref = session ? "/dashboard" : loginPath("/dashboard");
  const isAdmin = isAdminSession(session);
  const createHref = session
    ? "/dashboard/sops/new"
    : loginPath("/dashboard/sops/new");

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.classList.toggle("light", nextTheme === "light");
    localStorage.setItem("sop-theme", nextTheme);
    setTheme(nextTheme);
  }

  function logout() {
    clearSession();
    setSession(null);
    setProfileOpen(false);
    navigate("/");
  }

  const dashboardTheme = variant === "dashboard" && theme === "dark";

  return (
    <div
      className={cn(
        "min-h-screen overflow-x-clip",
        dashboardTheme
          ? "bg-[radial-gradient(circle_at_top,#090909_0%,#050505_55%,#000000_100%)] text-slate-100"
          : "bg-slate-50 text-slate-950 dark:bg-[#050505] dark:text-white",
      )}
    >
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md",
          dashboardTheme
            ? "border-white/10 bg-[#050505]/80"
            : "border-slate-200/60 bg-white/80 dark:border-white/10 dark:bg-[#070707]/80",
        )}
      >
        <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link to="/" className="group flex items-center gap-4 transition-transform hover:scale-[1.02]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f47920] to-[#cf5f0d] text-white shadow-lg shadow-orange-500/20 transition-shadow group-hover:shadow-orange-500/30">
                <BookOpenCheck className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    "text-lg font-black uppercase tracking-tighter",
                    dashboardTheme ? "text-white" : "text-slate-900 dark:text-white"
                  )}>
                    SOP
                  </span>
                  <span className="text-lg font-light uppercase tracking-widest text-[#f47920]">
                    Studio
                  </span>
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.2em] opacity-60",
                  dashboardTheme ? "text-slate-400" : "text-slate-500 dark:text-slate-400"
                )}>
                  Creation Workspace
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              <TopLink href="/" active={pathname === "/"} dashboardTheme={dashboardTheme}>
                <Library className="h-4 w-4" />
                Library
              </TopLink>
              <TopLink
                href="/sops/all"
                active={pathname === "/sops/all"}
                dashboardTheme={dashboardTheme}
              >
                <BookOpenCheck className="h-4 w-4" />
                All SOPs
              </TopLink>
              <TopLink
                href={createHref}
                active={pathname === "/dashboard/sops/new"}
                dashboardTheme={dashboardTheme}
              >
                <PencilLine className="h-4 w-4" />
                Create SOP
              </TopLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden h-8 w-px bg-slate-200 dark:bg-white/10 sm:block" />
            
            <button
              type="button"
              onClick={toggleTheme}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200",
                dashboardTheme
                  ? "border-white/10 bg-white/5 text-orange-400 hover:bg-white/10"
                  : "border-slate-200 bg-slate-50 text-orange-500 hover:border-orange-200 hover:bg-orange-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              )}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {session ? (
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200",
                    dashboardTheme
                      ? "border-white/10 bg-white/5 hover:border-orange-500/50 hover:bg-white/10"
                      : "border-slate-200 bg-white hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-orange-500/50"
                  )}
                >
                  <ProfileAvatar session={session} />
                </button>

                {profileOpen && (
                  <div className={cn(
                    "absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200",
                    dashboardTheme
                      ? "border-white/10 bg-[#0d0d0d] shadow-black/60"
                      : "border-slate-200 bg-white shadow-slate-200/50 dark:border-white/10 dark:bg-[#0d0d0d] dark:shadow-black/60"
                  )}>
                    <div className="border-b border-inherit p-5">
                      <div className="flex items-center gap-4">
                        <ProfileAvatar session={session} size="lg" />
                        <div className="min-w-0">
                          <p className="truncate text-base font-black">{session.user.name}</p>
                          <p className="truncate text-xs font-medium opacity-60">{session.user.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <Button
                        asChild
                        variant="ghost"
                        className={cn(
                          "mb-1 flex w-full items-center justify-start gap-3 rounded-xl px-4 py-3 text-sm font-bold",
                          dashboardTheme
                            ? "text-slate-200 hover:bg-white/5 hover:text-white"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white",
                        )}
                      >
                        <Link to={dashboardHref}>
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>
                      </Button>
                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-rose-500 transition-colors hover:bg-rose-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button asChild variant="ghost" className="h-10 w-10 rounded-xl p-0">
                <Link to={loginPath(pathname || "/dashboard")} title="Sign In">
                  <LogIn className="h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="h-20 shrink-0" />

      {variant === "dashboard" ? (
        <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-3 py-4 sm:px-4 lg:block lg:px-5 lg:pl-[304px]">
          <aside className="hidden lg:block">
            <div
              className={cn(
                "fixed left-5 top-[5rem] z-30 grid w-[240px] gap-3 rounded-xl p-3 shadow-xl",
                dashboardTheme
                  ? "border border-white/10 bg-[#050505]/90 shadow-black/30"
                  : "border border-slate-200 bg-white shadow-slate-950/10 dark:border-white/10 dark:bg-[#050505]/90 dark:shadow-black/30",
              )}
            >
              {dashboardLinks
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : item.href === "/dashboard/sops"
                      ? pathname === item.href ||
                        (pathname.startsWith("/dashboard/sops/") &&
                          pathname !== "/dashboard/sops/new" &&
                          pathname !== "/dashboard/sops/mine")
                      : item.href === "/dashboard/sops/mine"
                        ? pathname === item.href
                      : item.href === "/dashboard/sops/new"
                        ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
                      dashboardTheme
                        ? "text-slate-300 hover:bg-white/5 hover:text-white"
                        : "text-slate-600 hover:bg-orange-50 hover:text-[#cf5f0d] dark:text-[#86a0c4] dark:hover:bg-[#1b120c] dark:hover:text-white",
                      active &&
                        "bg-[#f47920] text-white shadow-lg shadow-orange-900/25 hover:bg-[#cf5f0d] hover:text-white dark:bg-[#f47920] dark:text-white dark:hover:bg-[#ff8a32]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}

            </div>
          </aside>
          <main className="min-w-0 lg:min-h-[calc(100vh-7rem)]">{children}</main>
        </div>
      ) : (
        <main className="min-w-0">{children}</main>
      )}
    </div>
  );
}

function ProfileAvatar({
  session,
  size = "md",
}: {
  session: StoredSession;
  size?: "md" | "lg";
}) {
  const dimensions = size === "lg" ? "h-12 w-12" : "h-8 w-8";
  const imageUrl = resolveAssetUrl(session.user.profile_picture);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn(
          dimensions,
          "shrink-0 rounded-lg border-2 border-white object-cover shadow-sm ring-1 ring-orange-100 dark:border-[#2a2a2a] dark:ring-0",
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        dimensions,
        "grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#f47920] to-[#cf5f0d] text-xs font-black text-white shadow-sm",
      )}
    >
      {session.user.name ? initials(session.user.name) : <UserRound className="h-4 w-4" />}
    </span>
  );
}

function TopLink({
  href,
  active,
  dashboardTheme,
  children,
}: {
  href: string;
  active: boolean;
  dashboardTheme?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      className={cn(
        "relative inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-bold transition-all duration-200",
        dashboardTheme
          ? "text-slate-400 hover:text-white"
          : "text-slate-500 hover:text-[#cf5f0d] dark:text-slate-400 dark:hover:text-white",
        active && (
          dashboardTheme
            ? "bg-white/10 text-orange-400"
            : "bg-orange-50 text-[#cf5f0d] dark:bg-white/5 dark:text-orange-400"
        )
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-1 left-4 right-4 h-0.5 rounded-full bg-[#f47920] shadow-[0_0_8px_rgba(244,121,32,0.5)]" />
      )}
    </Link>
  );
}
