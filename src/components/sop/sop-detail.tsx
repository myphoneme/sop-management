"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPost, resolveAssetUrl } from "@/lib/api";
import { getCurrentSession, isAdminSession, type StoredSession } from "@/lib/auth";
import type { SopDocument, SopPost } from "@/lib/types";
import { formatDate, readingMinutes } from "@/lib/utils";

function getDocumentIcon(document: SopDocument) {
  const extension = document.file_name.split(".").pop()?.toLowerCase() ?? "";
  if (["xls", "xlsx", "csv"].includes(extension)) {
    return FileSpreadsheet;
  }
  if (["ppt", "pptx"].includes(extension)) {
    return Presentation;
  }
  return FileText;
}

function getDocumentTypeLabel(document: SopDocument) {
  const extension = document.file_name.split(".").pop()?.toUpperCase() ?? "FILE";
  return extension;
}

export function SopDetail({ id }: { id: number }) {
  const [sop, setSop] = useState<SopPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<StoredSession | null>(null);
  const canEdit = sop
    ? isAdminSession(session) ||
      sop.created_by === session?.user.id ||
      sop.created_user?.email === session?.user.email
    : false;
  const visibility = sop?.visibility || "public";
  const visibilityTone = visibility === "draft" ? "amber" : visibility === "private" ? "violet" : "emerald";

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
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const data = await getPost(id);
        if (active) {
          setSop(data);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "SOP not found.");
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
  }, [id]);

  return (
    <AppShell>
      <article className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Library
            </Link>
          </Button>
          {canEdit && sop ? (
            <Button asChild variant="secondary">
              <Link to={`/dashboard/sops/${sop.id}/edit`}>
                <Edit3 className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="grid min-h-96 place-items-center rounded-lg border border-orange-100 bg-white dark:border-[#242424] dark:bg-[#101010]">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : error || !sop ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
            {error.includes("access") ? "You do not have access to this SOP." : error || "SOP not found."}
          </div>
        ) : (
          <>
            <header className="grid gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">{sop.category?.category_name || "Uncategorized"}</Badge>
                <Badge tone="slate">SOP-{sop.id}</Badge>
                <Badge tone={visibilityTone}>{visibility}</Badge>
              </div>
              <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-normal text-slate-950 dark:text-white sm:text-5xl">
                {sop.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  {sop.created_user?.name || "SOP Owner"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(sop.created_at)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {readingMinutes(sop.post)} min read
                </span>
              </div>
            </header>

            <div className="overflow-hidden rounded-lg border border-orange-100 bg-orange-100 shadow-sm dark:border-[#f47920]/20 dark:bg-black">
              {resolveAssetUrl(sop.image) ? (
                <img
                  src={resolveAssetUrl(sop.image)}
                  alt=""
                  className="aspect-[16/7] w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[16/7] place-items-center bg-[linear-gradient(135deg,#fff3e8,#ffffff_55%,#ffd6b5)] text-lg font-black text-[#a94b09] dark:bg-[linear-gradient(135deg,#050505,#17110c_55%,#3d1904)] dark:text-orange-200">
                  SOP
                </div>
              )}
            </div>

            <div className="rounded-lg border border-orange-100 bg-white px-5 py-6 text-slate-700 shadow-sm dark:border-[#242424] dark:bg-[#101010] dark:text-slate-200 sm:px-8 sm:py-8">
              <div
                className="sop-content text-slate-700 dark:text-slate-200"
                dangerouslySetInnerHTML={{ __html: sop.post || "" }}
              />
            </div>

            {sop.documents?.length ? (
              <section className="grid gap-4 rounded-lg border border-orange-100 bg-white p-5 shadow-sm dark:border-[#242424] dark:bg-[#101010] sm:p-6">
                <div className="grid gap-1">
                  <h2 className="text-xl font-black tracking-normal text-slate-950 dark:text-white">
                    Related documents
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Supporting files attached to this SOP.
                  </p>
                </div>
                <ul className="grid gap-3">
                  {sop.documents.map((document) => {
                    const Icon = getDocumentIcon(document);
                    const documentUrl = resolveAssetUrl(document.file_path);

                    return (
                      <li
                        key={document.id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-[#151515]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-black dark:text-slate-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">
                            {document.file_name}
                          </p>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {getDocumentTypeLabel(document)}
                          </p>
                        </div>
                        <Button asChild variant="secondary" size="sm">
                          <a href={documentUrl} target="_blank" rel="noopener noreferrer" download={document.file_name}>
                            <Download className="h-4 w-4" />
                            Open
                          </a>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </article>
    </AppShell>
  );
}
