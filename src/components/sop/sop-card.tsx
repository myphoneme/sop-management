import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SopPost } from "@/lib/types";
import { formatDate, readingMinutes, stripHtml } from "@/lib/utils";
import { resolveAssetUrl } from "@/lib/api";

export function SopCard({ sop, priority = false }: { sop: SopPost; priority?: boolean }) {
  const imageUrl = resolveAssetUrl(sop.image);
  const excerpt = stripHtml(sop.post).slice(0, 150);

  return (
    <Link
      href={`/sops/${sop.id}`}
      className="page-card group relative grid overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm transition duration-300 hover:border-orange-200 hover:shadow-lg dark:border-[#242424] dark:bg-[#101010] dark:hover:border-[#f47920]/45"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-orange-100 dark:bg-black">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06] group-hover:brightness-105"
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#fff3e8,#ffffff_55%,#ffd6b5)] text-sm font-semibold text-[#a94b09] dark:bg-[linear-gradient(135deg,#050505,#17110c_55%,#3d1904)] dark:text-orange-200">
            SOP
          </div>
        )}
        <div className="absolute left-3 top-3 z-10">
          <Badge tone="blue">{sop.category?.category_name || "Uncategorized"}</Badge>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/8 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-black/20" />
      </div>

      <div className="grid gap-4 p-5">
        <div className="grid gap-2">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span>{formatDate(sop.created_at)}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{readingMinutes(sop.post)} min</span>
          </div>
          <h2 className="line-clamp-2 text-xl font-black leading-tight tracking-normal text-slate-950 dark:text-white">
            {sop.title}
          </h2>
          <p className="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {excerpt || "No summary available yet."}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-orange-100 pt-4 dark:border-[#242424]">
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <UserRound className="h-4 w-4 shrink-0" />
            <span className="truncate">{sop.created_user?.name || "SOP Owner"}</span>
          </span>
          <span className="flex items-center gap-1 text-sm font-bold text-[#cf5f0d] dark:text-orange-200">
            Open <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
