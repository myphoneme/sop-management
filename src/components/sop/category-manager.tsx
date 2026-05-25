"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FolderKanban,
  Loader2,
  PenLine,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getPosts,
  updateCategory,
} from "@/lib/api";
import { getCurrentSession, isAdminSession, loginPath } from "@/lib/auth";
import type { Category, SopPost } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function CategoryManager() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<SopPost[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      getCurrentSession().then((storedSession) => {
        if (!active) return;

        if (!storedSession) {
          navigate(loginPath(pathname || "/dashboard/categories"), { replace: true });
          return;
        }

        setIsAdmin(isAdminSession(storedSession));
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
        const [categoryData, postData] = await Promise.all([
          getCategories(),
          getPosts(),
        ]);

        if (active) {
          setCategories(categoryData);
          setPosts(postData);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load categories.",
          );
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

  const counts = useMemo(() => {
    return posts.reduce<Record<number, number>>((acc, post) => {
      acc[post.category_id] = (acc[post.category_id] || 0) + 1;
      return acc;
    }, {});
  }, [posts]);

  const visibleCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return categories;
    }

    return categories.filter((category) =>
      category.category_name.toLowerCase().includes(normalized),
    );
  }, [categories, query]);

  function openCreateModal() {
    setEditingCategory(null);
    setName("");
    setModalError("");
    setModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setName(category.category_name);
    setModalError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingCategory(null);
    setName("");
    setModalError("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const categoryName = name.trim();
    if (!categoryName) {
      return;
    }

    setSaving(true);
    setModalError("");

    try {
      const category = editingCategory
        ? await updateCategory(editingCategory.id, categoryName)
        : await createCategory(categoryName);

      setCategories((current) => {
        if (!editingCategory) {
          return [...current, category];
        }

        return current.map((item) =>
          item.id === category.id ? category : item,
        );
      });
      showToast({
        tone: "success",
        title: editingCategory ? "Category updated" : "Category created",
        description: `${category.category_name} is now available in the category list.`,
      });
      closeModal();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to save category.";
      setModalError(message);
      showToast({
        tone: "error",
        title: "Category was not saved",
        description: message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(category: Category) {
    const linkedCount = counts[category.id] || 0;
    const confirmed = window.confirm(
      linkedCount
        ? `Delete ${category.category_name}? It has ${linkedCount} linked SOPs and the backend may reject it.`
        : `Delete ${category.category_name}?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingId(category.id);

    try {
      await deleteCategory(category.id);
      setCategories((current) =>
        current.filter((item) => item.id !== category.id),
      );
      showToast({
        tone: "success",
        title: "Category deleted",
        description: `${category.category_name} was removed from the category list.`,
      });
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete category.";
      setError(message);
      showToast({
        tone: "error",
        title: "Category was not deleted",
        description: message,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell variant="dashboard">
      <div className="grid gap-6">
        {!sessionChecked ? (
          <div className="grid min-h-96 place-items-center rounded-lg border border-orange-100 bg-white dark:border-[#242424] dark:bg-[#101010]">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button asChild variant="ghost">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button type="button" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                Create category
              </Button>
            </div>

            <header className="grid gap-3">
              <Badge tone="blue">Classification</Badge>
              <h1 className="text-3xl font-black tracking-normal text-slate-950 dark:text-white sm:text-4xl">
                SOP categories
              </h1>
              <p className="max-w-2xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                Create categories for SOP grouping. Editing and deletion are limited to admins.
              </p>
            </header>

            <section className="rounded-lg border border-orange-100 bg-white shadow-sm dark:border-[#242424] dark:bg-[#101010]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 p-4 dark:border-[#f47920]/20">
                <div>
                  <h2 className="text-base font-black tracking-normal text-slate-950 dark:text-white">
                    Category list
                  </h2>
                  <p className="text-sm font-semibold text-slate-500">
                    {visibleCategories.length} visible
                  </p>
                </div>
                <label className="relative w-full sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="pl-9"
                    placeholder="Search categories"
                  />
                </label>
              </div>

              {error ? (
                <div className="m-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div className="grid min-h-64 place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : visibleCategories.length === 0 ? (
                <div className="grid min-h-64 place-items-center p-8 text-center">
                  <div className="grid gap-3">
                    <h3 className="text-xl font-black tracking-normal text-slate-950 dark:text-white">
                      No categories found
                    </h3>
                    <Button type="button" onClick={openCreateModal}>
                      <Plus className="h-4 w-4" />
                      Create category
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-orange-50 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-[#f47920]/10">
                      <tr>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">SOPs</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {visibleCategories.map((category) => (
                        <tr key={category.id}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200">
                                <FolderKanban className="h-4 w-4" />
                              </span>
                              <span className="font-black text-slate-950 dark:text-white">
                                {category.category_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge tone={counts[category.id] ? "emerald" : "slate"}>
                              {counts[category.id] || 0} SOPs
                            </Badge>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-300">
                            {formatDate(category.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            {isAdmin ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openEditModal(category)}
                                >
                                  <PenLine className="h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => onDelete(category)}
                                  disabled={deletingId === category.id}
                                >
                                  {deletingId === category.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  Delete
                                </Button>
                              </div>
                            ) : (
                              <span className="block text-right text-xs font-semibold text-slate-400">
                                Admin only
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-orange-100 bg-white shadow-xl dark:border-[#f47920]/20 dark:bg-black">
            <div className="flex items-start justify-between gap-3 border-b border-orange-100 p-5 dark:border-[#f47920]/20">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black tracking-normal text-slate-950 dark:text-white">
                  <FolderKanban className="h-5 w-5" />
                  {editingCategory ? "Edit category" : "Create category"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Categories group SOPs in the public library and admin filters.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close modal"
                title="Close"
                onClick={closeModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={onSubmit} className="grid gap-4 p-5">
              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Category name
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Backup operations"
                  required
                />
              </label>

              {modalError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                  {modalError}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !name.trim()}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingCategory ? (
                    <PenLine className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingCategory ? "Save changes" : "Create category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
