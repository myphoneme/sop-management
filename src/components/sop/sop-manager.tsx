"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilePlus2,
  Loader2,
  PenLine,
  Search,
  Trash2,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { deleteSop, getCategories, getPosts, resolveAssetUrl } from "@/lib/api";
import { getCurrentSession, loginPath } from "@/lib/auth";
import type { Category, SopPost } from "@/lib/types";
import { cn, formatDate, initials, readingMinutes, stripHtml } from "@/lib/utils";

const POSTS_PER_PAGE = 10;

export function SopManager() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<SopPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      getCurrentSession().then((storedSession) => {
        if (!active) return;

        if (!storedSession) {
          navigate(loginPath(pathname || "/dashboard/sops"), { replace: true });
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
        const [postData, categoryData] = await Promise.all([
          getPosts(),
          getCategories(),
        ]);

        if (active) {
          setPosts(postData);
          setCategories(categoryData);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load SOPs.");
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
  }, [sessionChecked]);

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return posts
      .filter((post) => categoryId === "all" || String(post.category_id) === categoryId)
      .filter((post) => {
        if (!normalized) {
          return true;
        }

        return `${post.title} ${post.category?.category_name || ""} ${stripHtml(post.post)} ${post.created_user?.name || ""}`
          .toLowerCase()
          .includes(normalized);
      })
      .toSorted((a, b) => getPostTime(b) - getPostTime(a) || b.id - a.id);
  }, [categoryId, posts, query]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = useMemo(
    () =>
      filteredPosts.slice(
        (currentPage - 1) * POSTS_PER_PAGE,
        currentPage * POSTS_PER_PAGE,
      ),
    [currentPage, filteredPosts],
  );
  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    const start = Math.max(
      1,
      Math.min(currentPage - 2, totalPages - maxButtons + 1),
    );
    const end = Math.min(totalPages, start + maxButtons - 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);
  const pageStart =
    filteredPosts.length === 0 ? 0 : (currentPage - 1) * POSTS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * POSTS_PER_PAGE, filteredPosts.length);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  async function onDelete(id: number) {
    const post = posts.find((item) => item.id === id);
    const confirmed = window.confirm(`Delete ${post?.title || "this SOP"}?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      await deleteSop(id);
      setPosts((current) => current.filter((item) => item.id !== id));
      showToast({
        tone: "success",
        title: "SOP deleted",
        description: `${post?.title || "The SOP"} was removed.`,
      });
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete SOP.";
      setError(message);
      showToast({
        tone: "error",
        title: "SOP was not deleted",
        description: message,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell variant="dashboard">
      <div className="grid gap-3 pb-3">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#050505]/95 dark:shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5 dark:border-white/10">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="h-4 w-4 text-orange-400" />
                <h1 className="text-base font-black tracking-normal text-slate-950 dark:text-white">
                  SOPs
                </h1>
                <Badge tone="slate">{filteredPosts.length} visible</Badge>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Manage the full SOP inventory from one dashboard tab.
              </p>
            </div>
            <Button asChild className="border border-orange-300/20 bg-[#f47920] hover:bg-[#cf5f0d]">
              <Link to="/dashboard/sops/new">
                <FilePlus2 className="h-4 w-4" />
                New SOP
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3 sm:px-5 dark:border-white/10">
            <label className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 border-slate-200 bg-white pl-9 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Search SOPs, categories, or owners"
              />
            </label>
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setCurrentPage(1);
              }}
              className="h-10 min-w-52 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>

          {loading || !sessionChecked ? (
            <div className="grid min-h-64 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-orange-300" />
            </div>
          ) : error ? (
            <div className="m-4 rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-100">
              {error}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="grid min-h-64 place-items-center p-4 text-center">
              <div className="grid gap-3">
                <h2 className="text-lg font-black tracking-normal text-slate-950 dark:text-white">
                  No SOPs found
                </h2>
                <Button asChild>
                  <Link to="/dashboard/sops/new">
                    <FilePlus2 className="h-4 w-4" />
                    New SOP
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Cover</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Length</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {paginatedPosts.map((post) => {
                    const imageUrl = resolveAssetUrl(post.image);

                    return (
                      <tr key={post.id} className="align-middle transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <div className="relative h-14 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-[#121a2a]">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={post.title}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:bg-white/5">
                                SOP
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="max-w-sm px-4 py-3">
                          <Link
                            to={`/sops/${post.id}`}
                            className="line-clamp-1 font-black text-slate-950 hover:text-orange-500 dark:text-white dark:hover:text-orange-300"
                          >
                            {post.title}
                          </Link>
                          <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {stripHtml(post.post) || "No content"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <CategoryChip label={post.category?.category_name || "Uncategorized"} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-700 ring-1 ring-slate-200 dark:bg-zinc-500/10 dark:text-zinc-200 dark:ring-zinc-400/20">
                              {initials(post.created_user?.name)}
                            </span>
                            <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                              {post.created_user?.name || "Owner"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {readingMinutes(post.post)} min
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {formatDate(post.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <IconButton to={`/sops/${post.id}`} title="View SOP">
                              <Eye className="h-4 w-4" />
                            </IconButton>
                            <IconButton to={`/dashboard/sops/${post.id}/edit`} title="Edit SOP">
                              <PenLine className="h-4 w-4" />
                            </IconButton>
                            <Button
                              type="button"
                              variant="danger"
                              size="icon"
                              title="Delete SOP"
                              onClick={() => onDelete(post.id)}
                              disabled={deletingId === post.id}
                              className="h-9 w-9"
                            >
                              {deletingId === post.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-white/10 dark:text-slate-400">
                <span>
                  Showing {pageStart}-{pageEnd} of {filteredPosts.length} SOPs
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="h-9 border-slate-200 bg-white px-2.5 dark:border-white/10 dark:bg-white/5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {pageNumbers.map((page) => (
                      <Button
                        key={page}
                        type="button"
                        variant={currentPage === page ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "h-9 w-9 px-0",
                          currentPage === page
                            ? "bg-[#f47920] text-white hover:bg-[#cf5f0d]"
                            : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100",
                        )}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="h-9 border-slate-200 bg-white px-2.5 dark:border-white/10 dark:bg-white/5"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function IconButton({
  to,
  title,
  children,
}: {
  to: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      asChild
      variant="secondary"
      size="icon"
      title={title}
      className="h-9 w-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
    >
      <Link to={to}>{children}</Link>
    </Button>
  );
}

function CategoryChip({ label }: { label: string }) {
  const tones: Array<"blue" | "emerald" | "amber" | "violet" | "slate"> = [
    "blue",
    "emerald",
    "amber",
    "violet",
    "slate",
  ];
  const tone = tones[
    label.split("").reduce((total, char) => total + char.charCodeAt(0), 0) %
      tones.length
  ];

  return (
    <Badge
      tone={tone}
      className={cn(
        tone === "blue" && "border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-200",
        tone === "violet" && "border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-200",
      )}
    >
      {label}
    </Badge>
  );
}

function getPostTime(post: SopPost) {
  const time = post.created_at ? new Date(post.created_at).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
}
