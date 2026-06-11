import type {
  ApiUser,
  Category,
  LoginResponse,
  SopPayload,
  SopPost,
  UserPayload,
} from "@/lib/types";

const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";
const REMOTE_API_BASE_URL = "https://fastapi.phoneme.in";

function isLocalFrontend() {
  if (typeof window === "undefined") {
    return false;
  }

  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function getDefaultApiBaseUrl() {
  if (isLocalFrontend()) {
    return LOCAL_API_BASE_URL;
  }

  return REMOTE_API_BASE_URL;
}

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl()
).replace(/\/$/, "");

let activeApiBaseUrl = API_BASE_URL;
const SESSION_KEY = "sop_studio_session";

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

function getRequestBaseUrls() {
  const urls = [API_BASE_URL];

  if (isLocalFrontend() && API_BASE_URL !== REMOTE_API_BASE_URL) {
    urls.push(REMOTE_API_BASE_URL);
  }

  return Array.from(new Set(urls.map((url) => url.replace(/\/$/, ""))));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let lastNetworkError: unknown;

  for (const baseUrl of getRequestBaseUrls()) {
    let response: Response;

    try {
      const authHeader = getAuthHeader();
      const headers = new Headers(init?.headers);
      headers.set("Accept", "application/json");
      if (authHeader.Authorization && !headers.has("Authorization")) {
        headers.set("Authorization", authHeader.Authorization);
      }

      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        credentials: init?.credentials || "include",
        headers,
      });
    } catch (error) {
      lastNetworkError = error;
      continue;
    }

    activeApiBaseUrl = baseUrl;

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

  throw lastNetworkError instanceof Error
    ? lastNetworkError
    : new Error("Unable to reach API.");
}

function getAuthHeader() {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return {};
  }

  try {
    const session = JSON.parse(raw) as { token?: string; tokenType?: string };
    if (!session.token) {
      return {};
    }

    const tokenType = session.tokenType || "bearer";
    return { Authorization: `${tokenType} ${session.token}` };
  } catch {
    return {};
  }
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

  return `${activeApiBaseUrl}/${path.replace(/^\/+/, "")}`;
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

export async function getCurrentUser() {
  return request<ApiUser>("/auth/me", { cache: "no-store" });
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

export async function uploadContentImage(file: File) {
  const body = new FormData();
  body.append("file", file);

  return request<{ url: string }>("/upload", {
    method: "POST",
    body,
  });
}

export async function createSop(payload: SopPayload) {
  const body = new FormData();
  body.append("category_id", String(payload.categoryId));
  body.append("title", payload.title);
  body.append("post", payload.content);
  body.append("visibility", payload.visibility);
  if (!payload.image) {
    throw new Error("Cover image is required.");
  }
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
  body.append("visibility", payload.visibility);
  if (payload.image) {
    body.append("image", payload.image);
  }

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
