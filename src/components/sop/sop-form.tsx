"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileImage, ImagePlus, Loader2, Save } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { RichEditor } from "@/components/sop/rich-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createSop, getCategories, getPost, resolveAssetUrl, updateSop } from "@/lib/api";
import { getCurrentSession, loginPath } from "@/lib/auth";
import type { Category, SopPost, SopVisibility } from "@/lib/types";
import { stripHtml } from "@/lib/utils";

type SopFormProps = {
  mode: "create" | "edit";
  sopId?: number;
};

const MAX_COVER_IMAGE_BYTES = 1024 * 1024;

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

    if (file.size > MAX_COVER_IMAGE_BYTES) {
      const message =
        "Cover image must be 1 MB or smaller. The deployed server currently rejects larger uploads.";
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

  return (
    <AppShell variant="dashboard">
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-4 pb-4 lg:px-6">
        <header className="grid gap-1">
          <h1 className="text-2xl font-black tracking-normal text-slate-950 dark:text-white sm:text-[2rem]">
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
            className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]"
          >
            <section className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#0d1015]/95 dark:shadow-black/20">
              <div className="grid min-w-0 items-end gap-3 xl:grid-cols-[minmax(0,1fr)_240px_250px]">
                <div className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <label htmlFor="sop-title">SOP title</label>
                  <Input
                    id="sop-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g., Monthly database backup verification"
                    className="h-11 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#12151b] dark:text-slate-100 dark:placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <label htmlFor="sop-category">Category</label>
                  <Select
                    id="sop-category"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="h-11 border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#12151b] dark:text-slate-100"
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

                <div className="grid min-w-0 gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <label htmlFor="sop-tags">Tags / Subcategories</label>
                  <Input
                    id="sop-tags"
                    value={tagsValue}
                    onChange={(event) => setTagsValue(event.target.value)}
                    placeholder="Add tags or subcategories"
                    className="h-11 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#12151b] dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid min-w-0 gap-2 pt-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Procedure content
                </label>
                <RichEditor
                  value={content}
                  onChange={setContent}
                  className="[&_.sop-editor]:min-h-[340px] [&_.sop-editor]:bg-white [&_.sop-editor]:px-4 [&_.sop-editor]:py-4 [&_.sop-editor]:text-[13px] [&_.sop-editor]:leading-6 [&_.sop-editor]:text-slate-800 [&_.sop-editor_p]:text-slate-800 [&_.sop-editor_li]:text-slate-800 dark:[&_.sop-editor]:bg-[#101318] dark:[&_.sop-editor]:text-slate-100 dark:[&_.sop-editor_p]:text-slate-100 dark:[&_.sop-editor_li]:text-slate-100"
                />
              </div>
            </section>

            <aside className="grid min-w-0 content-start gap-3">
              <section className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#0d1015]/95 dark:shadow-black/20">
                <h2 className="flex items-center gap-2 text-base font-black tracking-normal text-slate-950 dark:text-white">
                  <ImagePlus className="h-5 w-5" />
                  Cover image
                </h2>
                <label className="grid aspect-[1.25/1] min-w-0 cursor-pointer place-items-center rounded-xl border border-dashed border-orange-200 bg-orange-50/40 px-4 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-[#101318] dark:text-slate-400">
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
                    <div className="grid gap-2">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        ☁
                      </div>
                      <p>Drag and drop an image here</p>
                      <p className="text-[#f47920]">or click to browse</p>
                      <p className="text-xs">JPG, PNG up to 1MB</p>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => onImageChange(event.target.files?.[0] || null)}
                  />
                </label>
              </section>

              <section className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#0d1015]/95 dark:shadow-black/20">
                <h2 className="flex items-center gap-2 text-base font-black tracking-normal text-slate-950 dark:text-white">
                  <span className="text-lg">◔</span>
                  Preview
                </h2>
                <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#101318]">
                  <Badge tone={publishVisibility === "private" ? "violet" : "emerald"} className="w-fit">
                    {publishVisibility === "private" ? "Private" : "Public"}
                  </Badge>
                  <h3 className="line-clamp-2 text-lg font-black leading-tight tracking-normal text-slate-950 dark:text-white">
                    {title || "Untitled SOP"}
                  </h3>
                  <p className="line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {previewText || "Content preview"}
                  </p>
                  <div className="grid gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5">
                        {categories.find((category) => String(category.id) === categoryId)
                          ?.category_name || "No category"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/5">
                      <div className="h-2 w-[86%] rounded-full bg-slate-300 dark:bg-white/10" />
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/5">
                      <div className="h-2 w-[72%] rounded-full bg-slate-300 dark:bg-white/10" />
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/5">
                      <div className="h-2 w-[62%] rounded-full bg-slate-300 dark:bg-white/10" />
                    </div>
                  </div>
                </div>
              </section>

              {error ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#0d1015]/95 dark:shadow-black/20">
                <label className="col-span-2 grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Publish visibility
                  <Select
                    value={publishVisibility}
                    onChange={(event) => setPublishVisibility(event.target.value as SopVisibility)}
                    className="h-11 border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#12151b] dark:text-slate-100"
                  >
                    <option value="public">Public - everyone can view</option>
                    <option value="private">Private - logged-in users only</option>
                  </Select>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11"
                  disabled={saving || !canSaveDraft}
                  onClick={() => saveSop("draft")}
                >
                  Save draft
                </Button>
                <Button type="submit" className="h-11" disabled={saving || !canPublish}>
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
