"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SopCard } from "@/components/sop/sop-card";
import { getCategories, getPosts } from "@/lib/api";
import { getStoredSession, loginPath, type StoredSession } from "@/lib/auth";
import type { Category, SopPost } from "@/lib/types";
import { cn, stripHtml } from "@/lib/utils";

const POSTS_PER_PAGE = 12;

export function InventoryLibrary() {
  const [posts, setPosts] = useState<SopPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSession(getStoredSession());
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [postData, categoryData] = await Promise.all([
          getPosts(),
          getCategories(),
        ]);

        if (!active) return;

        setPosts(postData);
        setCategories(categoryData);
        setError("");
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
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts
      .filter((post) => {
        const matchesCategory =
          categoryId === "all" || String(post.category_id) === categoryId;
        const text = `${post.title} ${post.category?.category_name || ""} ${stripHtml(
          post.post,
        )}`.toLowerCase();
        const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);

        return matchesCategory && matchesQuery;
      })
      .toSorted((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA || b.id - a.id;
      });
  }, [categoryId, posts, query]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  const createHref = session
    ? "/dashboard/sops/new"
    : loginPath("/dashboard/sops/new");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                SOP Inventory
              </h1>
              <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
                Explore our complete collection of Standard Operating Procedures.
              </p>
            </div>
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
              Showing {paginatedPosts.length} of {filteredPosts.length} procedures
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a] md:flex-row md:items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#f47920]" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-12 w-full rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-sm transition-all focus:border-[#f47920]/40 focus:ring-4 focus:ring-[#f47920]/5 dark:border-white/10 dark:bg-white/5 dark:focus:border-[#f47920]/40"
                placeholder="Search by title, category, or content..."
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden md:block" />
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f47920]/20 dark:border-white/10 dark:bg-[#0d0d0d] dark:text-slate-300 md:w-[200px]"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Content */}
          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white dark:border-white/10 dark:bg-[#0a0a0a]">
              <Loader2 className="h-12 w-12 animate-spin text-[#f47920]" />
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-12 text-center dark:border-rose-500/10 dark:bg-rose-500/5">
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-6 rounded-xl">
                Try Again
              </Button>
            </div>
          ) : paginatedPosts.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-[#0a0a0a]">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-50 dark:bg-white/5 mb-6">
                <Search className="h-8 w-8 text-slate-300 dark:text-white/20" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">No procedures found</h3>
                <p className="mt-2 max-w-sm text-slate-500 dark:text-slate-400">
                We couldn&apos;t find any SOPs matching your search criteria. Try adjusting your filters or create a new one.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Button variant="outline" onClick={() => { setQuery(""); setCategoryId("all"); }} className="rounded-xl font-bold">
                  Clear Filters
                </Button>
                <Button asChild className="rounded-xl font-bold">
                  <Link href={createHref}>Create New SOP</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedPosts.map((post, index) => (
                  <SopCard key={post.id} sop={post} priority={index < 8} />
                ))}
              </div>

              {/* Pagination UI */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 border-t border-slate-100 pt-8 dark:border-white/5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="h-10 w-10 rounded-xl border-slate-200 dark:border-white/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={cn(
                          "h-10 w-10 rounded-xl font-bold",
                          currentPage === page 
                            ? "bg-[#f47920] hover:bg-[#cf5f0d] text-white" 
                            : "border-slate-200 dark:border-white/10"
                        )}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className="h-10 w-10 rounded-xl border-slate-200 dark:border-white/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
