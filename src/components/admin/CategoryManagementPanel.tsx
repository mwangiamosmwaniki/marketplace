import { useEffect, useState, type FormEvent } from "react";
import {
  FolderTree,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useDialog } from "../../context/DialogContext";
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
  type AdminCategory,
  type AdminCategoryPayload,
} from "../../lib/api/adminCategories";

type CategoryDraft = {
  name: string;
  slug: string;
  parent_id: string;
  description: string;
  image_url: string;
  status: "active" | "inactive";
  sort_order: string;
};

const emptyDraft: CategoryDraft = {
  name: "",
  slug: "",
  parent_id: "",
  description: "",
  image_url: "",
  status: "active",
  sort_order: "0",
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDescendantIds(categoryId: number, categories: AdminCategory[]) {
  const descendants = new Set<number>();
  const pending = [categoryId];

  while (pending.length > 0) {
    const parentId = pending.pop();
    if (parentId === undefined) continue;

    for (const category of categories) {
      if (category.parent_id === parentId && !descendants.has(category.id)) {
        descendants.add(category.id);
        pending.push(category.id);
      }
    }
  }

  return descendants;
}

export function CategoryManagementPanel() {
  const { confirm } = useDialog();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setIsLoading(true);
      setLoadingError("");
      const result = await getAdminCategories();

      if (!isMounted) return;
      if (result.success && Array.isArray(result.data)) {
        setCategories(result.data);
      } else {
        setLoadingError(
          result.error?.message || "Categories could not be loaded.",
        );
      }
      setIsLoading(false);
    };

    void loadCategories();
    return () => {
      isMounted = false;
    };
  }, [reloadVersion]);

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setSlugEdited(false);
    setFormError("");
    setNotice("");
    setShowForm(true);
  };

  const startEdit = (category: AdminCategory) => {
    setEditingId(category.id);
    setDraft({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id?.toString() || "",
      description: category.description || "",
      image_url: category.image_url || "",
      status: category.status,
      sort_order: category.sort_order.toString(),
    });
    setSlugEdited(true);
    setFormError("");
    setNotice("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  };

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setNotice("");
    setIsSaving(true);

    const payload: AdminCategoryPayload = {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      parent_id: draft.parent_id ? Number(draft.parent_id) : null,
      description: draft.description.trim() || null,
      image_url: draft.image_url.trim() || null,
      status: draft.status,
      sort_order: Number(draft.sort_order),
    };

    try {
      const result = editingId
        ? await updateAdminCategory(editingId, payload)
        : await createAdminCategory(payload);

      if (!result.success || !result.data) {
        setFormError(
          result.error?.message || "The category could not be saved.",
        );
        return;
      }

      const savedCategory = result.data;
      setCategories((current) => {
        const next = editingId
          ? current.map((category) =>
              category.id === savedCategory.id ? savedCategory : category,
            )
          : [...current, savedCategory];
        return next.sort(
          (first, second) =>
            first.sort_order - second.sort_order ||
            first.name.localeCompare(second.name),
        );
      });
      setShowForm(false);
      setEditingId(null);
      setDraft(emptyDraft);
      setNotice(editingId ? "Category updated." : "Category created.");
    } catch {
      setFormError("The category could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeCategory = async (category: AdminCategory) => {
    if (
      !(await confirm(
        `Delete '${category.name}'? Categories with products or child categories cannot be deleted.`,
        "Delete category",
      ))
    ) {
      return;
    }

    setNotice("");
    setLoadingError("");
    const result = await deleteAdminCategory(category.id);
    if (!result.success) {
      setLoadingError(
        result.error?.message || "The category could not be deleted.",
      );
      return;
    }

    setCategories((current) =>
      current.filter((item) => item.id !== category.id),
    );
    setNotice("Category deleted.");
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCategories = categories.filter((category) => {
    const parentName = categories.find(
      (item) => item.id === category.parent_id,
    )?.name;
    return [category.name, category.slug, parentName || ""].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    );
  });
  const activeCount = categories.filter(
    (category) => category.status === "active",
  ).length;
  const forbiddenParents = editingId
    ? getDescendantIds(editingId, categories).add(editingId)
    : new Set<number>();

  return (
    <section className="space-y-5" aria-labelledby="categories-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Catalog
          </p>
          <h2
            id="categories-heading"
            className="mt-1 text-xl font-bold text-neutral-950"
          >
            Categories
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Manage the categories sellers use to organize marketplace products.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <Plus aria-hidden="true" size={16} />
          Add category
        </button>
      </div>

      {notice && (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      {loadingError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          <span>{loadingError}</span>
          <button
            type="button"
            onClick={() => setReloadVersion((version) => version + 1)}
            className="inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <RefreshCw aria-hidden="true" size={14} />
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-neutral-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-neutral-500">Total categories</p>
          <p className="mt-1 text-xl font-bold text-neutral-950">
            {categories.length}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-neutral-500">Active</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">
            {activeCount}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-neutral-500">Subcategories</p>
          <p className="mt-1 text-xl font-bold text-neutral-950">
            {categories.filter((category) => category.parent_id !== null).length}
          </p>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={submitCategory}
          className="space-y-4 rounded-md border border-neutral-200 bg-white p-4"
        >
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <h3 className="text-sm font-bold text-neutral-950">
              {editingId ? "Edit category" : "New category"}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              aria-label="Close category form"
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
            >
              <X aria-hidden="true" size={17} />
            </button>
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            >
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-neutral-700">
              <span>Category name</span>
              <input
                required
                maxLength={150}
                value={draft.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    name,
                    slug: slugEdited ? current.slug : makeSlug(name),
                  }));
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-neutral-700">
              <span>Slug</span>
              <input
                required
                maxLength={150}
                pattern="[a-zA-Z0-9\x2d]+"
                value={draft.slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setDraft((current) => ({
                    ...current,
                    slug: event.target.value,
                  }));
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-neutral-700">
              <span>Parent category</span>
              <select
                value={draft.parent_id}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    parent_id: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">No parent</option>
                {categories
                  .filter((category) => !forbiddenParents.has(category.id))
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs font-semibold text-neutral-700">
                <span>Sort order</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={draft.sort_order}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sort_order: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-neutral-700">
                <span>Status</span>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as CategoryDraft["status"],
                    }))
                  }
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <label className="space-y-1 text-xs font-semibold text-neutral-700 sm:col-span-2">
              <span>Image URL</span>
              <input
                type="url"
                maxLength={2048}
                value={draft.image_url}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    image_url: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-neutral-700 sm:col-span-2">
              <span>Description</span>
              <textarea
                rows={3}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70"
            >
              {isSaving ? (
                <LoaderCircle
                  aria-hidden="true"
                  size={15}
                  className="animate-spin"
                />
              ) : null}
              {editingId ? "Save changes" : "Create category"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-950">
              Marketplace categories
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              {filteredCategories.length} of {categories.length} categories
            </p>
          </div>
          <label className="relative w-full sm:max-w-xs">
            <Search
              aria-hidden="true"
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="search"
              aria-label="Search categories"
              placeholder="Search name, slug, or parent"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-md border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-neutral-500">
            <LoaderCircle
              aria-hidden="true"
              size={17}
              className="animate-spin"
            />
            Loading categories
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              {query ? <Search size={18} /> : <FolderTree size={18} />}
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-900">
              {query ? "No matching categories" : "No categories yet"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {query
                ? "Try a different search."
                : "Create a category to organize marketplace products."}
            </p>
            {!query && (
              <button
                type="button"
                onClick={startCreate}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline"
              >
                <Plus aria-hidden="true" size={15} />
                Add the first category
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] uppercase text-neutral-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Parent
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Sort order
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredCategories.map((category) => {
                  const parent = categories.find(
                    (item) => item.id === category.parent_id,
                  );
                  return (
                    <tr key={category.id} className="hover:bg-neutral-50/70">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-neutral-900">
                          {category.name}
                        </div>
                        <div className="mt-0.5 text-xs text-neutral-500">
                          {category.slug}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {parent?.name || "-"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-neutral-600">
                        {category.sort_order}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            category.status === "active"
                              ? "text-emerald-700"
                              : "text-neutral-500"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${
                              category.status === "active"
                                ? "bg-emerald-600"
                                : "bg-neutral-400"
                            }`}
                          />
                          {category.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            title={`Edit ${category.name}`}
                            aria-label={`Edit ${category.name}`}
                            className="rounded p-2 text-neutral-500 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <Pencil aria-hidden="true" size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeCategory(category)}
                            title={`Delete ${category.name}`}
                            aria-label={`Delete ${category.name}`}
                            className="rounded p-2 text-neutral-500 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 aria-hidden="true" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs leading-5 text-neutral-500">
        <Tags aria-hidden="true" size={15} className="mt-0.5 shrink-0" />
        Categories assigned to products or used as a parent are protected from
        deletion.
      </div>
    </section>
  );
}