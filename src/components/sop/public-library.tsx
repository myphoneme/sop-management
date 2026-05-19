"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenText,
  Filter,
  Loader2,
  Search,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SopCard } from "@/components/sop/sop-card";
import { getCategories, getPosts, resolveAssetUrl } from "@/lib/api";
import { getStoredSession, loginPath, type StoredSession } from "@/lib/auth";
import type { Category, SopPost } from "@/lib/types";
import { cn, stripHtml } from "@/lib/utils";

export function PublicLibrary() {
  const [posts, setPosts] = useState<SopPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<StoredSession | null>(null);

  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      .toSorted((a, b) => getPostTime(b) - getPostTime(a) || b.id - a.id);
  }, [categoryId, posts, query]);

  const featuredPosts = useMemo(() => filteredPosts.slice(0, 5), [filteredPosts]);

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

        if (!active) {
          return;
        }

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

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = window.requestAnimationFrame(() => {
      setPrefersReducedMotion(media.matches);
    });

    const handleChange = () => setPrefersReducedMotion(media.matches);
    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFeaturedIndex(0);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [filteredPosts.length, categoryId, query]);

  useEffect(() => {
    if (featuredPosts.length <= 1 || loading || prefersReducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % featuredPosts.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [featuredPosts.length, loading, prefersReducedMotion]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const featured = featuredPosts[featuredIndex % Math.max(1, featuredPosts.length)] || featuredPosts[0];
  const createHref = session
    ? "/dashboard/sops/new"
    : loginPath("/dashboard/sops/new");

  const selectedCategoryName = useMemo(() => {
    if (categoryId === "all") return "All Categories";
    return categories.find(c => String(c.id) === categoryId)?.category_name || "All Categories";
  }, [categoryId, categories]);

  return (
    <AppShell>
      {/* Professional Hero Section - Viewport Height Optimized */}
      <section className="relative flex min-h-[calc(100vh-5rem)] flex-col justify-center overflow-hidden bg-white px-4 py-8 dark:bg-[#030303] sm:px-6 lg:px-8">
        {/* Subtle Background Elements */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 opacity-20 dark:opacity-40">
          <div className="h-[500px] w-[800px] rounded-full bg-gradient-to-b from-orange-100/50 to-transparent blur-[120px] dark:from-orange-500/10" />
        </div>

        <div className="relative mx-auto w-full max-w-[1600px]">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_640px]">
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-[#cf5f0d] dark:border-orange-500/10 dark:bg-orange-500/5 dark:text-orange-400">
                <Sparkles className="h-3.5 w-3.5" />
                Knowledge Base
              </div>
              
              <h1 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-6xl xl:text-7xl">
                The modern standard for <span className="text-[#f47920]">Operating Procedures.</span>
              </h1>
              
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                A professional workspace to create, organize, and publish SOPs.
                Connected to your backend, designed for clarity and speed.
              </p>

              <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 group max-w-md">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#f47920]" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-12 w-full rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-sm transition-all focus:border-[#f47920]/40 focus:ring-4 focus:ring-[#f47920]/5 dark:border-white/10 dark:bg-white/5 dark:focus:border-[#f47920]/40"
                    placeholder="Search procedures..."
                  />
                </div>
                
                {/* Custom Professional Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm transition-all hover:border-slate-300 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-slate-300 sm:w-[200px]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Filter className={cn("h-4 w-4 text-slate-400 transition-colors", isCategoryOpen && "text-[#f47920]")} />
                      <span className="truncate">{selectedCategoryName}</span>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isCategoryOpen && "rotate-90")} />
                  </button>

                  {isCategoryOpen && (
                    <div className="absolute left-0 bottom-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 dark:border-white/10 dark:bg-[#0d0d0d] sm:w-[240px]">
                      <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                        <button
                          onClick={() => { setCategoryId("all"); setIsCategoryOpen(false); }}
                          className={cn(
                            "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors",
                            categoryId === "all" 
                              ? "bg-orange-50 text-[#cf5f0d] dark:bg-orange-500/10 dark:text-orange-400" 
                              : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                          )}
                        >
                          All Categories
                        </button>
                        <div className="my-1 h-px bg-slate-100 dark:bg-white/5" />
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => { setCategoryId(String(category.id)); setIsCategoryOpen(false); }}
                            className={cn(
                              "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors",
                              String(category.id) === categoryId
                                ? "bg-orange-50 text-[#cf5f0d] dark:bg-orange-500/10 dark:text-orange-400"
                                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                            )}
                          >
                            {category.category_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex items-center gap-6 text-sm">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-white">{posts.length}</span>
                  <span className="text-slate-500 dark:text-slate-400">Documents</span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-white">{categories.length}</span>
                  <span className="text-slate-500 dark:text-slate-400">Categories</span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                <Button asChild variant="ghost" className="h-auto p-0 font-bold text-[#f47920] hover:bg-transparent">
                  <Link to={createHref} className="flex items-center gap-1">
                    Start Writing <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="hidden lg:block">
              {featured && (
                <div className="relative aspect-[1.4/1] overflow-hidden rounded-[3rem] border-4 border-white bg-white shadow-2xl shadow-slate-950/10 dark:border-[#1a1a1a] dark:bg-[#0a0a0a] dark:shadow-black/30">
                  <div key={featured.id} className="absolute inset-0">
                    <FeaturedSlide post={featured} />
                  </div>

                  <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full border border-white/20 bg-black/20 px-2 py-1 backdrop-blur">
                    {featuredPosts.map((post, index) => {
                      const isActive = post.id === featured.id;

                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setFeaturedIndex(index)}
                          className={cn(
                            "h-2.5 rounded-full transition-all",
                            isActive ? "w-6 bg-[#f47920]" : "w-2.5 bg-white/50 hover:bg-white/80",
                          )}
                          aria-label={`Show featured SOP ${index + 1}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Grid Section */}
      <section className="mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6 dark:border-white/5">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Recent Procedures</h2>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Showing {filteredPosts.length} results
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white dark:border-white/10 dark:bg-[#0a0a0a]">
            <Loader2 className="h-8 w-8 animate-spin text-[#f47920]" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center dark:border-rose-500/10 dark:bg-rose-500/5">
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-[#0a0a0a]">
            <Search className="h-12 w-12 text-slate-200 dark:text-white/10 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">No procedures found</h3>
            <p className="mt-2 max-w-sm text-slate-500 dark:text-slate-400">
              We couldn&apos;t find any SOPs matching your search or filters. Try adjusting them or creating a new one.
            </p>
            <Button asChild className="mt-8 rounded-xl font-bold">
              <Link to={createHref}>Create New SOP</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPosts.slice(0, 12).map((post, index) => (
              <SopCard key={post.id} sop={post} priority={index < 4} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function getPostTime(post: SopPost) {
  const time = post.created_at ? new Date(post.created_at).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
}

function FeaturedSlide({ post }: { post: SopPost }) {
  return (
    <Link
      to={`/sops/${post.id}`}
      className="group relative block h-full w-full overflow-hidden"
    >
      {post.image ? (
        <img
          src={resolveAssetUrl(post.image)}
          alt={post.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-50 dark:bg-white/5">
          <BookOpenText className="h-24 w-24 text-slate-200 dark:text-white/10" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity" />

      <div className="absolute inset-0 flex flex-col justify-end p-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f47920] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-orange-500/40">
            <Sparkles className="h-3 w-3" />
            Featured
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 drop-shadow-md">
            {post.category?.category_name || "Uncategorized"}
          </span>
        </div>

        <h3 className="text-3xl font-black leading-[1.1] tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] xl:text-4xl">
          {post.title}
        </h3>

        <div className="mt-8 flex items-center gap-2 text-sm font-black text-[#f47920]">
          Read Full Procedure
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
