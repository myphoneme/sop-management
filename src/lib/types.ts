export type ApiUser = {
  id: number;
  name: string;
  email: string;
  profile_picture?: string | null;
};

export type Category = {
  id: number;
  category_name: string;
  created_at?: string | null;
  updated_at?: string | null;
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
  created_user?: Pick<ApiUser, "name" | "email"> | null;
  updated_user?: Pick<ApiUser, "name" | "email"> | null;
  category?: Category | null;
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
};

export type SopPayload = {
  title: string;
  categoryId: number;
  content: string;
  authorId: number;
  image: File;
};
