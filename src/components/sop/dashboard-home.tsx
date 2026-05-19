"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Clock3,
  FilePlus2,
  FolderKanban,
  Loader2,
  PieChart,
  PenLine,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UsersRound,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { deleteSop, getCategories, getPosts, resolveAssetUrl } from "@/lib/api";
import { getStoredSession, loginPath } from "@/lib/auth";
import type { Category, SopPost } from "@/lib/types";
import { cn, formatDate, initials, readingMinutes, stripHtml } from "@/lib/utils";

type Tone = "orange" | "violet" | "blue" | "emerald" | "amber" | "slate";

const chipStyles: Record<Tone, string> = {
  orange: "border-orange-200 bg-orange-50 text-[#c75b0f] dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-200",
  violet: "border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-200",
  blue: "border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-200",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
  amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200",
  slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
};

const metricAccentStyles: Record<
  Tone,
  { shell: string; icon: string; line: string }
> = {
  orange: {
    shell: "from-orange-50 to-white dark:from-orange-400/15 dark:to-orange-400/5",
    icon: "bg-orange-50 text-[#c75b0f] ring-1 ring-orange-200 dark:bg-orange-400/15 dark:text-orange-200 dark:ring-orange-300/20",
    line: "from-orange-400 via-amber-300 to-orange-300",
  },
  violet: {
    shell: "from-slate-50 to-white dark:from-zinc-500/15 dark:to-zinc-500/5",
    icon: "bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-zinc-500/15 dark:text-zinc-200 dark:ring-zinc-400/20",
    line: "from-zinc-400 via-zinc-300 to-slate-200",
  },
  blue: {
    shell: "from-slate-50 to-white dark:from-zinc-500/15 dark:to-zinc-500/5",
    icon: "bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-zinc-500/15 dark:text-zinc-200 dark:ring-zinc-400/20",
    line: "from-zinc-400 via-zinc-300 to-slate-200",
  },
  emerald: {
    shell: "from-emerald-50 to-white dark:from-emerald-400/15 dark:to-emerald-400/5",
    icon: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200 dark:ring-emerald-300/20",
    line: "from-emerald-400 via-teal-300 to-lime-300",
  },
  amber: {
    shell: "from-amber-50 to-white dark:from-amber-400/15 dark:to-amber-400/5",
    icon: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-300/20",
    line: "from-amber-400 via-orange-300 to-yellow-300",
  },
  slate: {
    shell: "from-slate-50 to-white dark:from-white/10 dark:to-white/[0.03]",
    icon: "bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10",
    line: "from-slate-400 via-slate-300 to-slate-200",
  },
};

const categoryPalette = [
  "#f47920",
  "#52525b",
  "#52525b",
  "#10b981",
  "#f59e0b",
  "#64748b",
];

export function DashboardHome() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<SopPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [referenceTime, setReferenceTime] = useState<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const storedSession = getStoredSession();

      if (!storedSession) {
        navigate(loginPath(pathname || "/dashboard"), { replace: true });
        return;
      }

      setSessionChecked(true);
    }, 0);

    return () => window.clearTimeout(timeout);
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
          setReferenceTime(Date.now());
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
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
    const visiblePosts = normalized
      ? posts.filter((post) =>
          `${post.title} ${post.category?.category_name || ""} ${stripHtml(post.post)} ${post.created_user?.name || ""}`
            .toLowerCase()
            .includes(normalized),
        )
      : posts;

    return visiblePosts.toSorted(
      (a, b) => getPostTime(b) - getPostTime(a) || b.id - a.id,
    );
  }, [posts, query]);

  const latestPost = filteredPosts[0] || null;

  const recentPosts = useMemo(() => {
    if (!referenceTime) {
      return 0;
    }

    const sevenDaysAgo = referenceTime - 7 * 24 * 60 * 60 * 1000;

    return posts.filter((post) => getPostTime(post) >= sevenDaysAgo).length;
  }, [posts, referenceTime]);

  const activeAuthors = useMemo(() => {
    return new Set(
      posts
        .map((post) => post.created_user?.name?.trim())
        .filter((name): name is string => Boolean(name)),
    ).size;
  }, [posts]);

  const averageMinutes = useMemo(() => {
    if (posts.length === 0) {
      return 0;
    }

    const total = posts.reduce((sum, post) => sum + readingMinutes(post.post), 0);

    return Math.max(1, Math.round(total / posts.length));
  }, [posts]);

  const monthlySeries = useMemo(
    () => buildMonthlySeries(posts, referenceTime ?? 1),
    [posts, referenceTime],
  );
  const categoryBreakdown = useMemo(
    () => buildCategoryBreakdown(filteredPosts.length > 0 ? filteredPosts : posts, categories),
    [filteredPosts, posts, categories],
  );
  const topCategory = categoryBreakdown[0] || null;

  async function onDelete(id: number) {
    const post = posts.find((item) => item.id === id);
    const confirmed = window.confirm("Delete this SOP?");
    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      await deleteSop(id);
      setPosts((current) => current.filter((post) => post.id !== id));
      showToast({
        tone: "success",
        title: "SOP deleted",
        description: `${post?.title || "The SOP"} was removed from inventory.`,
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
        {!sessionChecked ? (
          <div className="grid min-h-[24rem] place-items-center rounded-2xl border border-slate-200 bg-white/90 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#050505]/90 dark:shadow-black/30">
            <Loader2 className="h-6 w-6 animate-spin text-orange-300" />
          </div>
        ) : (
          <>
            <section className="grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCard
                icon={BookOpenCheck}
                label="Total SOPs"
                value={String(posts.length)}
                detail="Published procedures"
                accent="orange"
                spark={buildSparkline(monthlySeries, 0)}
              />
              <MetricCard
                icon={FolderKanban}
                label="Categories"
                value={String(categories.length)}
                detail="Active groupings"
                accent="slate"
                spark={buildSparkline(monthlySeries, 1)}
              />
              <MetricCard
                icon={Activity}
                label="New SOPs this week"
                value={String(recentPosts)}
                detail="Created in the last 7 days"
                accent="slate"
                spark={buildSparkline(monthlySeries, 2)}
              />
              <MetricCard
                icon={UsersRound}
                label="Active authors"
                value={String(activeAuthors)}
                detail="Unique contributors"
                accent="emerald"
                spark={buildSparkline(monthlySeries, 3)}
              />
            </section>

            <section className="grid items-start gap-2 2xl:grid-cols-[minmax(0,1.44fr)_minmax(220px,0.54fr)_minmax(220px,0.48fr)]">
              <div className="min-w-0">
                <LineChartPanel
                  values={monthlySeries}
                  total={posts.length}
                  recentPosts={recentPosts}
                />
              </div>
              <div className="min-w-0">
                <DonutPanel categories={categoryBreakdown} total={posts.length} />
              </div>
              <div className="min-w-0">
                <InsightPanel
                  topCategory={topCategory}
                  latestPost={latestPost}
                  averageMinutes={averageMinutes}
                  activeAuthors={activeAuthors}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#050505]/95 dark:shadow-black/30">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-5 dark:border-white/10">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-3.5 w-3.5 text-orange-300" />
                    <h2 className="text-sm font-black tracking-normal text-slate-950 dark:text-white">
                      SOP inventory
                    </h2>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                      {posts.length} SOPs
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    {filteredPosts.length} visible - newest first
                  </p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <label className="relative w-full sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="h-10 border-slate-200 bg-white pl-9 text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                      placeholder="Search SOPs, categories, or owners..."
                    />
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="grid min-h-36 place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-300" />
                </div>
              ) : error ? (
                <div className="m-4 rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">
                  {error}
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="grid min-h-36 place-items-center p-4 text-center">
                  <div className="grid gap-3">
                    <h3 className="text-lg font-black tracking-normal text-slate-950 dark:text-white">
                      No SOPs in inventory
                    </h3>
                    <Button
                      asChild
                      className="mx-auto border border-orange-300/20 bg-[#f47920] hover:bg-[#cf5f0d]"
                    >
                      <Link to="/dashboard/sops/new">
                        <FilePlus2 className="h-4 w-4" />
                        New SOP
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="max-h-[16rem] overflow-y-auto overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="sticky top-0 bg-white text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-[#050505] dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-2.5">Cover</th>
                        <th className="px-4 py-2.5">Title</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Owner</th>
                        <th className="px-4 py-2.5">Created</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8">
                      {filteredPosts.map((post) => {
                        const imageUrl = resolveAssetUrl(post.image);
                        const isFresh = isRecentPost(post, 30);

                        return (
                          <tr
                            key={post.id}
                            className="align-middle transition hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-2.5">
                              <div className="relative h-12 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-[#121a2a]">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={post.title}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#131d31,#0b1220_55%,#1d2b49)] text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                    SOP
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="max-w-sm px-4 py-2.5">
                              <Link
                                to={`/sops/${post.id}`}
                                className="line-clamp-1 font-black text-slate-950 hover:text-orange-300 dark:text-white"
                              >
                                {post.title}
                              </Link>
                              <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {stripHtml(post.post) || "No content"}
                              </p>
                            </td>
                            <td className="px-4 py-2.5">
                              <CategoryChip label={post.category?.category_name || "None"} />
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-700 ring-1 ring-slate-200 dark:bg-zinc-500/10 dark:text-zinc-200 dark:ring-zinc-400/20">
                                  {initials(post.created_user?.name)}
                                </span>
                                <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                                  {post.created_user?.name || "Owner"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                              {formatDate(post.created_at)}
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusChip tone={isFresh ? "emerald" : "slate"}>
                                {isFresh ? "Fresh" : "Live"}
                              </StatusChip>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex justify-end gap-2">
                                <Button
                                  asChild
                                  variant="secondary"
                                  size="sm"
                                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                                >
                                  <Link to={`/dashboard/sops/${post.id}/edit`}>
                                    <PenLine className="h-4 w-4" />
                                    Edit
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => onDelete(post.id)}
                                  disabled={deletingId === post.id}
                                >
                                  {deletingId === post.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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

function getPostTime(post: SopPost) {
  const time = post.created_at ? new Date(post.created_at).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
}

function isRecentPost(post: SopPost, days: number) {
  const time = getPostTime(post);
  if (!time) {
    return false;
  }

  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function buildMonthlySeries(posts: SopPost[], anchorTime: number) {
  const start = new Date(anchorTime);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const months = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(start);
    monthDate.setMonth(start.getMonth() - (5 - index));

    return {
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      label: new Intl.DateTimeFormat("en", { month: "short" }).format(monthDate),
      value: 0,
    };
  });

  const byMonth = new Map<string, number>();

  for (const post of posts) {
    const date = post.created_at ? new Date(post.created_at) : null;

    if (!date || Number.isNaN(date.getTime())) {
      continue;
    }

    const key = `${date.getFullYear()}-${date.getMonth()}`;
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  }

  return months.map((month) => ({
    ...month,
    value: byMonth.get(month.key) || 0,
  }));
}

function buildCategoryBreakdown(posts: SopPost[], categories: Category[]) {
  const counts = new Map<string, number>();

  for (const post of posts) {
    const label = post.category?.category_name || "Uncategorized";
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  const entries = Array.from(counts.entries())
    .map(([label, value], index) => ({
      label,
      value,
      color: categoryPalette[index % categoryPalette.length],
    }))
    .sort((a, b) => b.value - a.value);

  const knownCategoryNames = new Set(categories.map((category) => category.category_name));
  const uncategorized = entries.find((entry) => entry.label === "Uncategorized");

  if (!uncategorized && posts.some((post) => !post.category)) {
    entries.push({
      label: "Uncategorized",
      value: 0,
      color: "#64748b",
    });
  }

  for (const category of categories) {
    if (!knownCategoryNames.has(category.category_name)) {
      continue;
    }
  }

  return entries;
}

function buildSparkline(series: Array<{ value: number }>, offset = 0) {
  if (series.length === 0) {
    return [0, 1, 0, 1, 0, 1];
  }

  const values = series.map((point) => point.value);
  return values.map((value, index) => Math.max(0, value + ((index + offset) % 3) - 1));
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accent,
  spark,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  accent: Tone;
  spark: number[];
}) {
  const styles = metricAccentStyles[accent];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br p-2 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:shadow-black/30",
        styles.shell,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-0.5 text-base font-black tracking-normal text-slate-950 dark:text-white">{value}</p>
          <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <span className={cn("grid h-8 w-8 place-items-center rounded-xl", styles.icon)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-1.5 h-7">
        <Sparkline values={spark} />
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 240;
  const height = 30;
  const padding = 3;
  const points = buildPoints(values, width, height, padding);
  const path = pointsToPath(points);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
      <path
        d={`${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
        fill="rgba(244,121,32,0.08)"
      />
      <path d={path} fill="none" strokeLinecap="round" strokeLinejoin="round" stroke="#f47920" strokeWidth="2.5" />
      {points.map((point, index) => (
        <circle
          key={`${point.x}-${point.y}-${index}`}
          cx={point.x}
          cy={point.y}
          r={index === points.length - 1 ? 3.5 : 2.5}
          fill="#f47920"
          opacity={index === points.length - 1 ? 1 : 0.45}
        />
      ))}
    </svg>
  );
}

function LineChartPanel({
  values,
  total,
  recentPosts,
}: {
  values: Array<{ label: string; value: number }>;
  total: number;
  recentPosts: number;
}) {
  const chartWidth = 560;
  const chartHeight = 170;
  const padding = 18;
  const points = buildPoints(
    values.map((value) => value.value),
    chartWidth,
    chartHeight,
    padding,
  );
  const path = pointsToPath(points);
  const area = areaPath(points, chartWidth, chartHeight, padding);
  const maxValue = Math.max(1, ...values.map((item) => item.value));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#050505]/95 dark:shadow-black/30 2xl:col-span-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-orange-300" />
            <h2 className="text-sm font-black tracking-normal text-slate-950 dark:text-white">
              SOP Growth Overview
            </h2>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Volume across the last 6 months
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Last 6 months
        </span>
      </div>

      <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-[#101010]">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-28 w-full">
          {Array.from({ length: 5 }, (_, index) => {
            const y = padding + ((chartHeight - padding * 2) / 4) * index;
            return (
          <line
                key={y}
                x1={padding}
                x2={chartWidth - padding}
                y1={y}
                y2={y}
                stroke="rgba(15,23,42,0.06)"
              />
            );
          })}
          <path d={area} fill="rgba(244,121,32,0.18)" />
          <path d={path} fill="none" stroke="#f47920" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {points.map((point, index) => (
            <g key={`${point.x}-${point.y}-${index}`}>
              <circle cx={point.x} cy={point.y} r={4.5} fill="#f47920" />
              <circle cx={point.x} cy={point.y} r={8} fill="rgba(244,121,32,0.12)" />
            </g>
          ))}
          {values.map((item, index) => {
            const x = points[index]?.x || padding;
            return (
              <text
                key={item.label}
                x={x}
                y={chartHeight - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[11px] font-semibold dark:fill-slate-400"
              >
                {item.label}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Total SOPs
          </p>
          <p className="text-sm font-black text-slate-950 dark:text-white">{total}</p>
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Recent
          </p>
          <p className="text-sm font-black text-slate-950 dark:text-white">{recentPosts}</p>
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Peak
          </p>
          <p className="text-sm font-black text-slate-950 dark:text-white">{maxValue}</p>
        </div>
      </div>
    </div>
  );
}

function DonutPanel({
  categories,
  total,
}: {
  categories: Array<{ label: string; value: number; color: string }>;
  total: number;
}) {
  const active = categories.filter((entry) => entry.value > 0);
  const segments = active.length > 0 ? active : [{ label: "None", value: 1, color: "#64748b" }];
  const totalValues = segments.reduce((sum, entry) => sum + entry.value, 0);
  const visibleSegments = segments.slice(0, 4);
  const hiddenTotal = Math.max(
    0,
    segments.slice(4).reduce((sum, entry) => sum + entry.value, 0),
  );
  const gradient = segments
    .map((entry, index) => {
      const start = segments
        .slice(0, index)
        .reduce((sum, previous) => sum + (previous.value / totalValues) * 100, 0);
      const end = start + (entry.value / totalValues) * 100;

      return `${entry.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#050505]/95 dark:shadow-black/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-slate-300" />
            <h2 className="text-sm font-black tracking-normal text-slate-950 dark:text-white">
              SOPs by category
            </h2>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            Distribution of SOPs across active groups
          </p>
        </div>
      </div>

      <div className="mt-2 grid gap-1.5">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-[#101010]">
          <div
            className="grid h-full w-full place-items-center rounded-full"
            style={{
              background: `conic-gradient(${gradient})`,
            }}
          >
            <div className="grid h-14 w-14 place-items-center rounded-full border border-slate-200 bg-white text-center dark:border-white/10 dark:bg-[#050505]">
              <div>
                <div className="text-lg font-black text-slate-950 dark:text-white">{total}</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Total
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-1">
          {visibleSegments.map((entry) => (
            <div
              key={entry.label}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                  {entry.label}
                </span>
              </div>
              <span className="text-[10px] font-black text-slate-950 dark:text-white">{entry.value}</span>
            </div>
          ))}
          {hiddenTotal > 0 ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                <span className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                  Others
                </span>
              </div>
              <span className="text-[10px] font-black text-slate-950 dark:text-white">{hiddenTotal}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InsightPanel({
  topCategory,
  latestPost,
  averageMinutes,
  activeAuthors,
}: {
  topCategory: { label: string; value: number; color: string } | null;
  latestPost: SopPost | null;
  averageMinutes: number;
  activeAuthors: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#050505]/95 dark:shadow-black/30">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-slate-300" />
        <h2 className="text-sm font-black tracking-normal text-slate-950 dark:text-white">Quick insights</h2>
      </div>

      <div className="mt-2 grid gap-1.5">
        <InsightRow
          icon={FolderKanban}
          label="Top category"
          value={topCategory ? topCategory.label : "None"}
          detail={topCategory ? `${topCategory.value} SOPs` : "No category data"}
          color="slate"
        />
        <InsightRow
          icon={CalendarDays}
          label="Latest SOP"
          value={latestPost ? latestPost.title : "No SOPs yet"}
          detail={latestPost ? formatDate(latestPost.created_at) : "Waiting for content"}
          color="slate"
        />
        <InsightRow
          icon={BarChart3}
          label="Average length"
          value={`${averageMinutes} min`}
          detail="Approximate reading time"
          color="amber"
        />
        <InsightRow
          icon={UsersRound}
          label="Active authors"
          value={String(activeAuthors)}
          detail="Unique contributors"
          color="emerald"
        />
      </div>
    </div>
  );
}

function InsightRow({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  color: Tone;
}) {
  const styles = metricAccentStyles[color];

  return (
    <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
      <div className={cn("grid h-7 w-7 place-items-center rounded-xl", styles.icon)}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="truncate text-[11px] font-semibold text-slate-950 dark:text-white">{value}</p>
        <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
    </div>
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
  const index =
    label.split("").reduce((total, char) => total + char.charCodeAt(0), 0) %
    tones.length;
  const tone = tones[index];

  return (
    <Badge tone={tone} className={chipStyles[tone]}>
      {label}
    </Badge>
  );
}

function StatusChip({
  tone,
  children,
}: {
  tone: "emerald" | "slate";
  children: React.ReactNode;
}) {
  return (
    <Badge tone={tone === "emerald" ? "emerald" : "slate"} className={chipStyles[tone]}>
      {children}
    </Badge>
  );
}

function buildPoints(
  values: number[],
  width: number,
  height: number,
  padding: number,
) {
  const normalized = values.length > 0 ? values : [0];
  const max = Math.max(1, ...normalized);
  const step = normalized.length === 1 ? 0 : (width - padding * 2) / (normalized.length - 1);

  return normalized.map((value, index) => {
    const x = padding + step * index;
    const y = height - padding - ((value / max) * (height - padding * 2));

    return { x, y };
  });
}

function pointsToPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function areaPath(
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  padding: number,
) {
  if (points.length === 0) {
    return "";
  }

  const path = pointsToPath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${path} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`;
}
