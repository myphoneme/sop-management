"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileImage, FilePlus, FileText, ImagePlus, Loader2, Save, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { RichEditor } from "@/components/sop/rich-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createSop, getCategories, getPost, resolveAssetUrl, updateSop } from "@/lib/api";
import { getCurrentSession, loginPath } from "@/lib/auth";
import type { Category, SopDocument, SopPost, SopVisibility } from "@/lib/types";
import { stripHtml } from "@/lib/utils";

type SopFormProps = {
  mode: "create" | "edit";
  sopId?: number;
};

const MAX_COVER_IMAGE_BYTES = 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
]);

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SopForm({ mode, sopId }: SopFormProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingSop, setExistingSop] = useState<SopPost | null>(null);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagsValue, setTagsValue] = useState("");
  const [publishVisibility, setPublishVisibility] = useState<SopVisibility>("public");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [existingDocuments, setExistingDocuments] = useState<SopDocument[]>([]);
  const [newDocuments, setNewDocuments] = useState<File[]>([]);
  const [removedDocumentIds, setRemovedDocumentIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      getCurrentSession().then((session) => {
        if (!active) return;

        if (!session) {
          navigate(loginPath(pathname || "/dashboard/sops/new"), { replace: true });
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
    if (!sessionChecked) return;

    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [categoryData, sopData] = await Promise.all([
          getCategories(),
          mode === "edit" && sopId ? getPost(sopId) : Promise.resolve(null),
        ]);

        if (!active) return;

        setCategories(categoryData);

        if (sopData) {
          setExistingSop(sopData);
          setTitle(sopData.title);
          setCategoryId(String(sopData.category_id));
          setContent(sopData.post || "");
          setExistingDocuments(sopData.documents ?? []);
          if (sopData.visibility === "private" || sopData.visibility === "public") {
            setPublishVisibility(sopData.visibility);
          } else {
            setPublishVisibility("public");
          }
        } else if (categoryData[0]) {
          setCategoryId(String(categoryData[0].id));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load form data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [mode, sessionChecked, sopId]);

  const previewText = useMemo(() => stripHtml(content), [content]);
  const canSaveDraft =
    title.trim().length > 2 &&
    Number(categoryId) > 0 &&
    stripHtml(content).length > 5;
  const canPublish =
    title.trim().length > 2 &&
    Number(categoryId) > 0 &&
    stripHtml(content).length > 5 &&
    (mode === "edit" ? Boolean(existingSop?.image || image) : Boolean(image));

  async function saveSop(visibility: SopVisibility) {
    setError("");

    if (visibility === "draft" ? !canSaveDraft : !canPublish) {
      return;
    }

    if (visibility !== "draft" && mode === "create" && !image) {
      const message = "Cover image is required.";
      setError(message);
      showToast({
        tone: "error",
        title: "Cover image required",
        description: message,
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        categoryId: Number(categoryId),
        content,
        visibility,
        image: image || null,
        documents: newDocuments,
        removeDocumentIds: removedDocumentIds,
      };

      const saved =
        mode === "edit" && sopId ? await updateSop(sopId, payload) : await createSop(payload);

      showToast({
        tone: "success",
        title: visibility === "draft" ? "Draft saved" : mode === "edit" ? "SOP updated" : "SOP created",
        description:
          visibility === "draft"
            ? `${saved.title} is visible only to you.`
            : `${saved.title} is ready to view.`,
      });
      navigate(visibility === "draft" ? "/dashboard/sops/mine" : `/sops/${saved.id}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to save SOP.";
      setError(message);
      showToast({
        tone: "error",
        title: "SOP was not saved",
        description: message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSop(publishVisibility);
  }

  function onImageChange(file: File | null) {
    if (!file) {
      setImage(null);
      return;
    }

    if (!ALLOWED_COVER_TYPES.has(file.type)) {
      const message = "Cover image must be JPG, PNG, or WEBP.";
      setImage(null);
      setError(message);
      showToast({
        tone: "error",
        title: "Unsupported cover image",
        description: message,
      });
      return;
    }

    if (file.size > MAX_COVER_IMAGE_BYTES) {
      const message = "Cover image must be 1 MB or smaller.";
      setImage(null);
      setError(message);
      showToast({
        tone: "error",
        title: "Image is too large",
        description: message,
      });
      return;
    }

    setError("");
    setImage(file);
  }

  function onDocumentsChange(fileList: FileList | null) {
    if (!fileList?.length) return;

    const accepted: File[] = [];
    for (const file of Array.from(fileList)) {
      const extension = getFileExtension(file.name);
      if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
        const message = "Related documents must be PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, or CSV.";
        setError(message);
        showToast({
          tone: "error",
          title: "Unsupported document",
          description: message,
        });
        return;
      }

      if (file.size > MAX_DOCUMENT_BYTES) {
        const message = `Each related document must be 10 MB or smaller (${file.name}).`;
        setError(message);
        showToast({
          tone: "error",
          title: "Document is too large",
          description: message,
        });
        return;
      }

      accepted.push(file);
    }

    setError("");
    setNewDocuments((current) => [...current, ...accepted]);
  }

  function removeExistingDocument(documentId: number) {
    setExistingDocuments((current) => current.filter((document) => document.id !== documentId));
    setRemovedDocumentIds((current) =>
      current.includes(documentId) ? current : [...current, documentId],
    );
  }

  function removeNewDocument(index: number) {
    setNewDocuments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  const visibleExistingDocuments = existingDocuments;

  return (
    <AppShell variant="dashboard">
      <div className="mx-auto grid w-full max-w-[1440px] gap-2">
        <header>
          <h1 className="text-xl font-black tracking-normal text-slate-950 dark:text-white sm:text-2xl">
            {mode === "edit" ? "Update SOP" : "Create a new SOP"}
          </h1>
        </header>

        {!sessionChecked || loading ? (
          <div className="grid min-h-56 place-items-center rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#0d1015]/95 dark:shadow-black/20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]"
          >
            <section className="flex min-h-0 min-w-0 flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#0d1015]/95 dark:shadow-black/20">
              <div className="grid min-w-0 items-end gap-2.5 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
                <div className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <label htmlFor="sop-title">SOP title</label>
                  <Input
                    id="sop-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g., Monthly database backup verification"
                    className="h-10 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#12151b] dark:text-slate-100 dark:placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <label htmlFor="sop-category">Category</label>
                  <Select
                    id="sop-category"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="h-10 border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#12151b] dark:text-slate-100"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.category_name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <label htmlFor="sop-tags">Tags / Subcategories</label>
                  <Input
                    id="sop-tags"
                    value={tagsValue}
                    onChange={(event) => setTagsValue(event.target.value)}
                    placeholder="Add tags or subcategories"
                    className="h-10 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#12151b] dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="flex min-h-[280px] flex-col gap-1.5 lg:min-h-0 lg:flex-1">
                <label className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Procedure content
                </label>
                <RichEditor
                  fillHeight
                  value={content}
                  onChange={setContent}
                  className="min-h-[220px] flex-1 lg:min-h-0 [&_.sop-editor]:bg-white [&_.sop-editor]:px-3 [&_.sop-editor]:py-3 [&_.sop-editor]:text-[13px] [&_.sop-editor]:leading-6 [&_.sop-editor]:text-slate-800 [&_.sop-editor_p]:text-slate-800 [&_.sop-editor_li]:text-slate-800 dark:[&_.sop-editor]:bg-[#101318] dark:[&_.sop-editor]:text-slate-100 dark:[&_.sop-editor_p]:text-slate-100 dark:[&_.sop-editor_li]:text-slate-100"
                />
              </div>
            </section>

            <aside className="grid min-w-0 gap-2 self-stretch">
              <section className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#0d1015]/95 dark:shadow-black/20">
                <h2 className="flex items-center gap-2 text-sm font-black tracking-normal text-slate-950 dark:text-white">
                  <ImagePlus className="h-4 w-4" />
                  Cover image
                </h2>
                <label className="grid h-36 min-w-0 cursor-pointer place-items-center rounded-lg border border-dashed border-orange-200 bg-orange-50/40 px-3 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-[#101318] dark:text-slate-400">
                  {existingSop?.image && !image ? (
                    <img
                      src={resolveAssetUrl(existingSop.image)}
                      alt=""
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : image ? (
                    <div className="grid gap-2 text-center text-slate-700 dark:text-slate-200">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                        <FileImage className="h-4 w-4" />
                      </div>
                      <span className="min-w-0 truncate">{image.name}</span>
                    </div>
                  ) : (
                    <div className="grid gap-1">
                      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        ☁
                      </div>
                      <p className="text-xs">Drop image or click to browse</p>
                      <p className="text-[11px] text-slate-400">JPG, PNG, or WEBP · 1 MB max</p>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => onImageChange(event.target.files?.[0] || null)}
                  />
                </label>
              </section>

              <section className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#0d1015]/95 dark:shadow-black/20">
                <h2 className="flex items-center gap-2 text-sm font-black tracking-normal text-slate-950 dark:text-white">
                  <FilePlus className="h-4 w-4" />
                  Related documents
                </h2>
                <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                  Optional. PDF, DOC, XLS, PPT, TXT, CSV · 10 MB each.
                </p>
                <label className="grid min-h-20 cursor-pointer place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-[#101318] dark:text-slate-400">
                  <div className="grid gap-1">
                    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                      <FileText className="h-4 w-4" />
                    </div>
                    <p className="text-xs">Add documents</p>
                  </div>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    className="sr-only"
                    onChange={(event) => {
                      onDocumentsChange(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {visibleExistingDocuments.length || newDocuments.length ? (
                  <ul className="grid gap-2">
                    {visibleExistingDocuments.map((document) => (
                      <li
                        key={`existing-${document.id}`}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#101318]"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                            {document.file_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatFileSize(document.file_size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingDocument(document.id)}
                          className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-rose-600 dark:hover:bg-white/5"
                          aria-label={`Remove ${document.file_name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                    {newDocuments.map((document, index) => (
                      <li
                        key={`new-${document.name}-${index}`}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#101318]"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                            {document.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatFileSize(document.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewDocument(index)}
                          className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-rose-600 dark:hover:bg-white/5"
                          aria-label={`Remove ${document.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#0d1015]/95 dark:shadow-black/20">
                <h2 className="text-sm font-black tracking-normal text-slate-950 dark:text-white">
                  Preview
                </h2>
                <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-[#101318]">
                  <Badge tone={publishVisibility === "private" ? "violet" : "emerald"} className="w-fit">
                    {publishVisibility === "private" ? "Private" : "Public"}
                  </Badge>
                  <h3 className="line-clamp-2 text-sm font-black leading-tight tracking-normal text-slate-950 dark:text-white">
                    {title || "Untitled SOP"}
                  </h3>
                  <p className="line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                    {previewText || "Content preview"}
                  </p>
                  <span className="w-fit rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] dark:border-white/10 dark:bg-white/5">
                    {categories.find((category) => String(category.id) === categoryId)
                      ?.category_name || "No category"}
                  </span>
                </div>
              </section>

              {error ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#0d1015]/95 dark:shadow-black/20">
                <label className="col-span-2 grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Publish visibility
                  <Select
                    value={publishVisibility}
                    onChange={(event) => setPublishVisibility(event.target.value as SopVisibility)}
                    className="h-10 border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#12151b] dark:text-slate-100"
                  >
                    <option value="public">Public - everyone can view</option>
                    <option value="private">Private - logged-in users only</option>
                  </Select>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10"
                  disabled={saving || !canSaveDraft}
                  onClick={() => saveSop("draft")}
                >
                  Save draft
                </Button>
                <Button type="submit" className="h-10" disabled={saving || !canPublish}>
                  <Save className="h-4 w-4" />
                  Publish SOP
                </Button>
              </div>
            </aside>
          </form>
        )}
      </div>
    </AppShell>
  );
}
