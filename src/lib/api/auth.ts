import { apiRequest } from "./client";

export type AuthSeller = {
  id: string;
  user_id: string;
  store_name: string;
  slug: string;
  legal_name: string;
  status: string;
  commission_rate: number | string;
  rating: number | string;
  description?: string | null;
  logo_path?: string | null;
  banner_path?: string | null;
  created_at?: string;
  profile?: {
    business_registration_number?: string | null;
    kra_pin?: string;
    county?: string;
    town?: string;
    physical_address?: string;
  } | null;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at?: string;
  seller?: AuthSeller | null;
  roles?: Array<{ slug?: string; name?: string }>;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export async function registerUser(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
  sellerBusinessName?: string;
}) {
  const { sellerBusinessName, ...userFields } = payload;
  return apiRequest<AuthSession>("/auth/register", "POST", {
    ...userFields,
    ...(sellerBusinessName ? { seller_business_name: sellerBusinessName } : {}),
  });
}

export async function loginUser(payload: { email: string; password: string }) {
  return apiRequest<AuthSession>("/auth/login", "POST", payload);
}

export async function logoutUser() {
  return apiRequest<{ message: string }>("/auth/logout", "POST");
}

export async function getCurrentUser() {
  return apiRequest<{ user: AuthUser }>("/auth/me", "GET");
}
