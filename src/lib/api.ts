import type {
  ApiUser,
  Category,
  LoginResponse,
  SopPayload,
  SopPost,
  UserPayload,
} from "@/lib/types";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  const text = await response.text();
  const data = text ? safeJson(text) : undefined;

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function emptyOn404<T>(error: unknown, fallback: T) {
  if (error instanceof ApiError && error.status === 404) {
    return fallback;
  }

  throw error;
}

export function resolveAssetUrl(path?: string | null) {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export async function getPosts() {
  try {
    return await request<SopPost[]>("/posts", { cache: "no-store" });
  } catch (error) {
    return emptyOn404(error, [] as SopPost[]);
  }
}

export async function getPost(id: number) {
  return request<SopPost>(`/posts/${id}`, { cache: "no-store" });
}

export async function getCategories() {
  try {
    return await request<Category[]>("/categories", { cache: "no-store" });
  } catch (error) {
    return emptyOn404(error, [] as Category[]);
  }
}

export async function createCategory(categoryName: string) {
  return request<Category>("/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ category_name: categoryName }),
  });
}

export async function updateCategory(id: number, categoryName: string) {
  return request<Category>(`/categories/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ category_name: categoryName }),
  });
}

export async function deleteCategory(id: number) {
  await request<unknown>(`/categories/${id}`, {
    method: "DELETE",
  });
}

export async function login(email: string, password: string) {
  const body = new FormData();
  body.append("username", email);
  body.append("password", password);

  return request<LoginResponse>("/login", {
    method: "POST",
    body,
  });
}

export async function getUsers() {
  try {
    return await request<ApiUser[]>("/users", { cache: "no-store" });
  } catch (error) {
    return emptyOn404(error, [] as ApiUser[]);
  }
}

export async function createUser(payload: UserPayload) {
  return request<ApiUser>("/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: number, payload: UserPayload) {
  return request<ApiUser>(`/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: number) {
  await request<unknown>(`/users/${id}`, {
    method: "DELETE",
  });
}

export async function createSop(payload: SopPayload) {
  const body = new FormData();
  body.append("category_id", String(payload.categoryId));
  body.append("title", payload.title);
  body.append("post", payload.content);
  body.append("created_by", String(payload.authorId));
  body.append("image", payload.image);

  return request<SopPost>("/posts", {
    method: "POST",
    body,
  });
}

export async function updateSop(id: number, payload: SopPayload) {
  const body = new FormData();
  body.append("id", String(id));
  body.append("category_id", String(payload.categoryId));
  body.append("title", payload.title);
  body.append("post", payload.content);
  body.append("created_by", String(payload.authorId));
  body.append("image", payload.image);

  return request<SopPost>(`/posts/${id}`, {
    method: "PUT",
    body,
  });
}

export async function deleteSop(id: number) {
  await request<unknown>(`/posts/${id}`, {
    method: "DELETE",
  });
}
