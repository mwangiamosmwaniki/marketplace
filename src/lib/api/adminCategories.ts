import { apiRequest } from "./client";

export type AdminCategory = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  status: "active" | "inactive";
  sort_order: number;
};

export type AdminCategoryPayload = Omit<AdminCategory, "id">;

export function getAdminCategories() {
  return apiRequest<AdminCategory[]>("/admin/categories");
}

export function createAdminCategory(category: AdminCategoryPayload) {
  return apiRequest<AdminCategory>("/admin/categories", "POST", category);
}

export function updateAdminCategory(
  id: number,
  category: AdminCategoryPayload,
) {
  return apiRequest<AdminCategory>(
    `/admin/categories/${id}`,
    "PATCH",
    category,
  );
}

export function deleteAdminCategory(id: number) {
  return apiRequest<{ success: boolean }>(`/admin/categories/${id}`, "DELETE");
}