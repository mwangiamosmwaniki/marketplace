import { apiRequest, ApiEnvelope } from "./client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at?: string;
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
}) {
  return apiRequest<AuthSession>("/auth/register", "POST", payload);
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
