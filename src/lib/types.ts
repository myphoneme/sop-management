export type ApiUser = {
  id: number;
  name: string;
  email: string;
  role?: "admin" | "user" | string;
  profile_picture?: string | null;
};

export type Category = {
  id: number;
  category_name: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SopVisibility = "draft" | "private" | "public";

export type SopDocument = {
  id: number;
  file_name: string;
  file_path: string;
  content_type: string;
  file_size: number;
  created_at?: string | null;
};

export type SopPost = {
  id: number;
  category_id: number;
  title: string;
  post: string;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  image?: string | null;
  visibility?: SopVisibility;
  created_user?: Pick<ApiUser, "name" | "email"> | null;
  updated_user?: Pick<ApiUser, "name" | "email"> | null;
  category?: Category | null;
  documents?: SopDocument[];
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: ApiUser;
};

export type UserPayload = {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "user";
};

export type SopPayload = {
  title: string;
  categoryId: number;
  content: string;
  visibility: SopVisibility;
  image?: File | null;
  documents?: File[];
  removeDocumentIds?: number[];
};
