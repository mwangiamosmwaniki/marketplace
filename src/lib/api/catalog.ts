import { apiRequest } from "./client";

export async function getProducts() {
  return apiRequest<unknown>("/products", "GET");
}

export async function getCategories() {
  return apiRequest<unknown>("/categories", "GET");
}

export async function getSellers() {
  return apiRequest<unknown>("/sellers/featured", "GET");
}
