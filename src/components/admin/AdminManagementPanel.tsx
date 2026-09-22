import React, { useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  ShieldCheck,
  Lock,
  FileText,
  UserX,
  LogOut,
  KeyRound,
  Pencil,
  Trash2,
} from "lucide-react";
import { useMarketplace } from "../../context/MarketplaceContext";
import { useDialog } from "../../context/DialogContext";
import { Role, User } from "../../types";
import { ROLE_PERMISSIONS } from "../../config/permissions";

const localStorage = {
  getItem: (key: string) =>
    typeof window === "undefined" ? null : window.localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
};

const roles: { value: Role; label: string; description: string }[] = [
  {
    value: "super_admin",
    label: "Super Admin",
    description: "Platform-wide governance and security",
  },
  {
    value: "product_admin",
    label: "Product Admin",
    description: "Catalog, categories and product moderation",
  },
  {
    value: "seller_admin",
    label: "Seller Admin",
    description: "Seller onboarding and verification",
  },
  {
    value: "finance_admin",
    label: "Finance Admin",
    description: "Payments, refunds and payouts",
  },
  {
    value: "logistics_admin",
    label: "Logistics Admin",
    description: "Delivery zones and fulfillment",
  },
  {
    value: "marketing_admin",
    label: "Marketing Admin",
    description: "Coupons and promotions",
  },
  {
    value: "support_admin",
    label: "Support Admin",
    description: "Tickets and customer support",
  },
  {
    value: "seller",
    label: "Seller",
    description: "Storefront and seller operations",
  },
  {
    value: "customer",
    label: "Customer",
    description: "Shopping and account access",
  },
];

const permissionModules = [
  "Users",
  "Sellers",
  "Products",
  "Categories",
  "Orders",
  "Payments",
  "Refunds",
  "Payouts",
  "Inventory",
  "Logistics",
  "Marketing",
  "Support",
  "Reports",
  "Settings",
  "Security",
  "CMS",
  "Audit Logs",
];
const rolePermissions: Record<string, string[]> = {
  super_admin: permissionModules,
  product_admin: ["Products", "Categories", "Reports"],
  seller_admin: ["Users", "Sellers", "Reports"],
  finance_admin: ["Orders", "Payments", "Refunds", "Payouts", "Reports"],
  logistics_admin: ["Orders", "Inventory", "Logistics", "Reports"],
  marketing_admin: ["Products", "Marketing", "Reports"],
  support_admin: ["Users", "Orders", "Support"],
  seller: ["Products", "Orders", "Inventory", "Payouts"],
  customer: ["Orders"],
};

interface CustomRole {
  id: string;
  label: string;
  description: string;
  permissions: string[];
  enabled: boolean;
  createdAt: string;
}

const actionButton =
  "px-2 py-1 rounded border border-neutral-300 text-[11px] font-semibold hover:bg-neutral-50";

export const AdminManagementPanel: React.FC<{
  initialTab?: "users" | "roles" | "security" | "audit" | "system";
}> = ({ initialTab = "users" }) => {
  const { alert, confirm } = useDialog();
  const {
    authUser,
    users,
    orders,
    supportTickets,
    addresses,
    payouts,
    auditLogs,
    settings,
    updateSettings,
    createUser,
    updateUser,
    deleteUser,
    suspendUser,
    restoreUser,
    deactivateUser,
    anonymizeUser,
    requirePasswordChange,
    requireUserReverification,
    forceLogoutUser,
  } = useMarketplace();
  const tab = initialTab;
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | User["status"]>(
    "all",
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "customer" as Role,
    status: "active" as User["status"],
  });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [platformFlags, setPlatformFlags] = useState(
    () =>
      JSON.parse(
        localStorage.getItem("kesales_feature_flags") ||
          JSON.stringify({
            sellerRegistration: true,
            customerRegistration: true,
            guestCheckout: true,
            reviews: true,
            wishlist: true,
            coupons: true,
            flashSales: true,
            sellerPromotions: true,
          }),
      ) as Record<string, boolean>,
  );
  const [notificationChannels, setNotificationChannels] = useState(
    () =>
      JSON.parse(
        localStorage.getItem("kesales_notification_channels") ||
          JSON.stringify({
            email: true,
            sms: true,
            whatsapp: false,
            inApp: true,
          }),
      ) as Record<string, boolean>,
  );
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(
    () =>
      JSON.parse(
        localStorage.getItem("kesales_custom_roles") || "[]",
      ) as CustomRole[],
  );
  const [roleOverrides, setRoleOverrides] = useState<
    Record<string, Pick<CustomRole, "label" | "description" | "permissions" | "enabled">>
  >(
    () =>
      JSON.parse(localStorage.getItem("kesales_role_overrides") || "{}") as Record<
        string,
        Pick<CustomRole, "label" | "description" | "permissions" | "enabled">
      >,
  );
  const [deletedRoleIds, setDeletedRoleIds] = useState<string[]>(
    () => JSON.parse(localStorage.getItem("kesales_deleted_roles") || "[]") as string[],
  );
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<CustomRole>({
    id: "",
    label: "",
    description: "",
    permissions: [],
    enabled: true,
    createdAt: "",
  });

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesQuery = `${user.name} ${user.email} ${user.phone}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return (
          matchesQuery &&
          (roleFilter === "all" || user.role === roleFilter) &&
          (statusFilter === "all" || user.status === statusFilter)
        );
      }),
    [users, query, roleFilter, statusFilter],
  );

  const create = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newUser.name || !newUser.email) return;
    const permissions = ROLE_PERMISSIONS[newUser.role] ||
      customRoles.find((role) => role.id === newUser.role)?.permissions || [];
    if (editingUserId) {
      updateUser(editingUserId, { ...newUser, permissions });
    } else {
      createUser({ ...newUser, permissions });
    }
    setNewUser({
      name: "",
      email: "",
      phone: "",
      role: "customer",
      status: "active",
    });
    setEditingUserId(null);
    setShowCreate(false);
  };

  const startEditingUser = (user: User) => {
    setEditingUserId(user.id);
    setNewUser({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    });
    setShowCreate(true);
  };

  const confirmAction = async (message: string, action: () => void) => {
    if (await confirm(message)) action();
  };
  const selectedUser = users.find((user) => user.id === selectedUserId);
  const directoryRoles = [
    ...roles
      .filter((role) => !deletedRoleIds.includes(role.value))
      .map((role) => ({
        value: role.value,
        label: roleOverrides[role.value]?.label || role.label,
        description:
          roleOverrides[role.value]?.description || role.description,
        permissions:
          roleOverrides[role.value]?.permissions || rolePermissions[role.value],
        enabled: roleOverrides[role.value]?.enabled ?? true,
        system: true,
      })),
    ...customRoles.map((role) => ({ ...role, value: role.id, system: false })),
  ];
  const allRoles = [
    ...directoryRoles.map(({ value, label, description }) => ({
      value,
      label,
      description,
    })),
  ];
  const setFlag = (key: string, value: boolean) => {
    const next = { ...platformFlags, [key]: value };
    setPlatformFlags(next);
    localStorage.setItem("kesales_feature_flags", JSON.stringify(next));
  };
  const setChannel = (key: string, value: boolean) => {
    const next = { ...notificationChannels, [key]: value };
    setNotificationChannels(next);
    localStorage.setItem("kesales_notification_channels", JSON.stringify(next));
  };
  const saveRole = (event: React.FormEvent) => {
    event.preventDefault();
    if (!roleDraft.label.trim()) return;
    const role = {
      ...roleDraft,
      id:
        roleDraft.id ||
        `custom_${roleDraft.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now()}`,
      createdAt: roleDraft.createdAt || new Date().toISOString(),
    };
    if (editingRoleId && roles.some((item) => item.value === editingRoleId)) {
      const nextOverrides = {
        ...roleOverrides,
        [editingRoleId]: {
          label: role.label,
          description: role.description,
          permissions: role.permissions,
          enabled: role.enabled,
        },
      };
      setRoleOverrides(nextOverrides);
      localStorage.setItem(
        "kesales_role_overrides",
        JSON.stringify(nextOverrides),
      );
    } else {
      const next = editingRoleId
        ? customRoles.map((item) => (item.id === editingRoleId ? role : item))
        : [role, ...customRoles];
      setCustomRoles(next);
      localStorage.setItem("kesales_custom_roles", JSON.stringify(next));
    }
    setEditingRoleId(null);
    setShowRoleForm(false);
    setRoleDraft({
      id: "",
      label: "",
      description: "",
      permissions: [],
      enabled: true,
      createdAt: "",
    });
  };
  const deleteRole = async (role: CustomRole) => {
    if (users.some((user) => user.role === role.id)) {
      await alert("Reassign all users from this role before deleting it.");
      return;
    }
    if (!(await confirm(`Delete the ${role.label} role?`))) return;
    const next = customRoles.filter((item) => item.id !== role.id);
    setCustomRoles(next);
    localStorage.setItem("kesales_custom_roles", JSON.stringify(next));
  };
  const deleteDirectoryRole = async (role: (typeof directoryRoles)[number]) => {
    if (users.some((user) => user.role === role.value)) {
      await alert("Reassign all users from this role before deleting it.");
      return;
    }
    if (!(await confirm(`Delete the ${role.label} role?`))) return;
    if (role.system) {
      const next = [...deletedRoleIds, role.value];
      setDeletedRoleIds(next);
      localStorage.setItem("kesales_deleted_roles", JSON.stringify(next));
    } else {
      await deleteRole({
        id: role.value,
        label: role.label,
        description: role.description,
        permissions: role.permissions,
        enabled: role.enabled,
        createdAt:
          "createdAt" in role && typeof role.createdAt === "string"
            ? role.createdAt
            : new Date().toISOString(),
      });
    }
  };
  const toggleRole = (role: CustomRole) => {
    const next = customRoles.map((item) =>
      item.id === role.id ? { ...item, enabled: !item.enabled } : item,
    );
    setCustomRoles(next);
    localStorage.setItem("kesales_custom_roles", JSON.stringify(next));
  };

  return (
    <div className="space-y-4 text-xs">
      {tab === "roles" && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Role directory management</h3>
              <p className="text-neutral-500">
                Create, edit, disable, and delete roles with configurable
                permissions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingRoleId(null);
                setShowRoleForm(true);
                setRoleDraft({
                  id: "",
                  label: "",
                  description: "",
                  permissions: [],
                  enabled: true,
                  createdAt: "",
                });
              }}
              className="bg-amber-500 text-neutral-950 px-3 py-2 rounded-lg font-bold"
            >
              New role
            </button>
          </div>
          {showRoleForm && (
            <form
              onSubmit={saveRole}
              className="grid grid-cols-1 md:grid-cols-3 gap-2"
            >
            <input
              required
              placeholder="Role name"
              value={roleDraft.label}
              onChange={(event) =>
                setRoleDraft({ ...roleDraft, label: event.target.value })
              }
              className="border border-neutral-300 rounded px-2 py-2"
            />
            <input
              placeholder="Role description"
              value={roleDraft.description}
              onChange={(event) =>
                setRoleDraft({ ...roleDraft, description: event.target.value })
              }
              className="border border-neutral-300 rounded px-2 py-2"
            />
            <button className="bg-neutral-900 text-white rounded px-3 py-2 font-bold">
              {editingRoleId ? "Save changes" : "Create role"}
            </button>
            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {permissionModules.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 text-[11px]"
                >
                  <input
                    type="checkbox"
                    checked={roleDraft.permissions.includes(permission)}
                    onChange={(event) =>
                      setRoleDraft({
                        ...roleDraft,
                        permissions: event.target.checked
                          ? [...roleDraft.permissions, permission]
                          : roleDraft.permissions.filter(
                              (item) => item !== permission,
                            ),
                      })
                    }
                  />
                  {permission}
                </label>
              ))}
            </div>
              <button
                type="button"
                onClick={() => {
                  setEditingRoleId(null);
                  setShowRoleForm(false);
                }}
                className="text-neutral-500 text-left"
              >
                Cancel
              </button>
            </form>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {customRoles.filter((role) => !roles.some((item) => item.value === role.id)).map((role) => (
              <div
                key={role.id}
                className="border border-neutral-200 rounded-lg p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <strong>{role.label}</strong>
                  <p className="text-neutral-500">
                    {role.description || "No description"} •{" "}
                    {role.permissions.length} permissions
                  </p>
                  <span
                    className={
                      role.enabled ? "text-emerald-700" : "text-red-700"
                    }
                  >
                    {role.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={actionButton}
                    onClick={() => {
                      setEditingRoleId(role.id);
                      setShowRoleForm(true);
                      setRoleDraft(role);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={actionButton}
                    onClick={() => toggleRole(role)}
                  >
                    {role.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    className={actionButton}
                    onClick={() => deleteRole(role)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-52">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email or phone"
                className="w-full border border-neutral-300 rounded-lg pl-9 pr-3 py-2"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as typeof roleFilter)
              }
              className="border border-neutral-300 rounded-lg px-3 py-2"
            >
              <option value="all">All roles</option>
              {allRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              className="border border-neutral-300 rounded-lg px-3 py-2"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <button
              onClick={() => {
                setEditingUserId(null);
                setNewUser({
                  name: "",
                  email: "",
                  phone: "",
                  role: "customer",
                  status: "active",
                });
                setShowCreate(!showCreate);
              }}
              className="bg-amber-500 text-neutral-950 px-3 py-2 rounded-lg font-bold flex items-center gap-1"
            >
              <UserPlus className="w-4 h-4" /> Create user
            </button>
          </div>
          {showCreate && (
            <form
              onSubmit={create}
              className="bg-amber-50 border border-amber-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-2"
            >
              <div className="sm:col-span-4 flex items-center justify-between">
                <strong>{editingUserId ? "Edit account" : "Create account"}</strong>
                {editingUserId && (
                  <button
                    type="button"
                    className="text-neutral-500"
                    onClick={() => {
                      setEditingUserId(null);
                      setShowCreate(false);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              <input
                required
                placeholder="Full name"
                value={newUser.name}
                onChange={(event) =>
                  setNewUser({ ...newUser, name: event.target.value })
                }
                className="border border-neutral-300 rounded px-2 py-2"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(event) =>
                  setNewUser({ ...newUser, email: event.target.value })
                }
                className="border border-neutral-300 rounded px-2 py-2"
              />
              <input
                placeholder="Phone"
                value={newUser.phone}
                onChange={(event) =>
                  setNewUser({ ...newUser, phone: event.target.value })
                }
                className="border border-neutral-300 rounded px-2 py-2"
              />
              <select
                value={newUser.role}
                onChange={(event) =>
                  setNewUser({ ...newUser, role: event.target.value as Role })
                }
                className="border border-neutral-300 rounded px-2 py-2"
              >
                {allRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <select
                value={newUser.status}
                onChange={(event) =>
                  setNewUser({
                    ...newUser,
                    status: event.target.value as User["status"],
                  })
                }
                className="border border-neutral-300 rounded px-2 py-2"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <button className="bg-neutral-900 text-white rounded px-3 py-2 font-bold sm:col-span-4">
                {editingUserId ? "Save account" : "Create account"}
              </button>
            </form>
          )}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b border-neutral-200 uppercase text-[10px] text-neutral-500">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3">Activity</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedUserId(user.id)}
                        className="text-left"
                      >
                        <strong className="block">{user.name}</strong>
                        <span className="text-neutral-500">
                          {user.email} • {user.phone}
                        </span>
                      </button>
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${user.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={user.role}
                        disabled={
                          user.id === authUser?.id &&
                          user.role === "super_admin"
                        }
                        onChange={(event) =>
                          updateUser(user.id, {
                            role: event.target.value as Role,
                            permissions:
                              rolePermissions[event.target.value as Role],
                          })
                        }
                        className="border border-neutral-200 rounded px-2 py-1"
                      >
                        {allRoles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 capitalize">
                      {user.verificationStatus?.replace("_", " ") ||
                        "not tracked"}
                      {user.mustChangePassword && (
                        <span className="block text-amber-700">
                          Password change required
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-500">
                      Created {new Date(user.createdAt).toLocaleDateString()}
                      <span className="block">
                        Last login{" "}
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString()
                          : "not recorded"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          className={actionButton}
                          onClick={() => startEditingUser(user)}
                        >
                          <Pencil className="w-3 h-3 inline" /> Edit account
                        </button>
                        {user.status === "active" ? (
                          <button
                            className={actionButton}
                            onClick={() =>
                              confirmAction(`Suspend ${user.name}?`, () =>
                                suspendUser(user.id),
                              )
                            }
                          >
                            <UserX className="w-3 h-3 inline" /> Suspend
                          </button>
                        ) : (
                          <button
                            className={actionButton}
                            onClick={() => restoreUser(user.id)}
                          >
                            Reactivate
                          </button>
                        )}
                        <button
                          className={actionButton}
                          onClick={() => forceLogoutUser(user.id)}
                        >
                          <LogOut className="w-3 h-3 inline" /> Revoke sessions
                        </button>
                        <button
                          className={actionButton}
                          onClick={() => requirePasswordChange(user.id)}
                        >
                          <KeyRound className="w-3 h-3 inline" /> Require
                          password change
                        </button>
                        <button
                          className={actionButton}
                          onClick={() => requireUserReverification(user.id)}
                        >
                          <ShieldCheck className="w-3 h-3 inline" /> Re-verify
                        </button>
                        <button
                          className={actionButton}
                          disabled={
                            user.id === authUser?.id ||
                            user.role === "super_admin"
                          }
                          onClick={() =>
                            confirmAction(
                              `Delete ${user.name}'s account permanently?`,
                              () => {
                                deleteUser(user.id);
                                if (selectedUserId === user.id) {
                                  setSelectedUserId(null);
                                }
                              },
                            )
                          }
                        >
                          <Trash2 className="w-3 h-3 inline" /> Delete
                        </button>
                        <button
                          className={actionButton}
                          onClick={() =>
                            confirmAction(`Deactivate ${user.name}?`, () =>
                              deactivateUser(user.id),
                            )
                          }
                        >
                          Deactivate
                        </button>
                        <button
                          className={actionButton}
                          onClick={() =>
                            confirmAction(
                              `Anonymize ${user.name}? This cannot be undone.`,
                              () => anonymizeUser(user.id),
                            )
                          }
                        >
                          Anonymize
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedUser && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold text-sm">
                    {selectedUser.name} profile
                  </h3>
                  <p className="text-neutral-500">
                    Account history, related records and authorized internal
                    notes.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="text-neutral-500"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div>
                  Orders
                  <strong className="block text-lg">
                    {
                      orders.filter(
                        (order) => order.customerId === selectedUser.id,
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  Support tickets
                  <strong className="block text-lg">
                    {
                      supportTickets.filter(
                        (ticket) => ticket.userId === selectedUser.id,
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  Addresses
                  <strong className="block text-lg">
                    {
                      addresses.filter(
                        (address) => address.fullName === selectedUser.name,
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  Payouts
                  <strong className="block text-lg">
                    {
                      payouts.filter(
                        (payout) => payout.sellerId === selectedUser.sellerId,
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  Audit events
                  <strong className="block text-lg">
                    {
                      auditLogs.filter((log) => log.userId === selectedUser.id)
                        .length
                    }
                  </strong>
                </div>
              </div>
              <label className="block">
                Internal admin notes
                <textarea
                  value={selectedUser.adminNotes || ""}
                  onChange={(event) =>
                    updateUser(selectedUser.id, {
                      adminNotes: event.target.value,
                    })
                  }
                  className="w-full border border-neutral-300 rounded p-2 mt-1"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {tab === "roles" && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <h3 className="font-bold text-sm">Role directory</h3>
            <div className="mt-3 overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full min-w-[680px] text-left">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Assigned users</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {directoryRoles.map((role) => (
                    <tr key={role.value} className="hover:bg-neutral-50">
                      <td className="px-3 py-3 font-bold whitespace-nowrap">
                        {role.label}
                      </td>
                      <td className="px-3 py-3 text-neutral-500">
                        {role.description || "No description"}
                      </td>
                      <td className="px-3 py-3 text-emerald-700">
                        {users.filter((user) => user.role === role.value).length}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            role.enabled
                              ? "text-emerald-700"
                              : "text-red-700"
                          }
                        >
                          {role.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className={actionButton}
                            onClick={() => {
                              setEditingRoleId(role.value);
                              setShowRoleForm(true);
                              setRoleDraft({
                                id: role.value,
                                label: role.label,
                                description: role.description,
                                permissions: role.permissions,
                                enabled: role.enabled,
                                createdAt:
                                  "createdAt" in role &&
                                  typeof role.createdAt === "string"
                                    ? role.createdAt
                                    : "",
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={actionButton}
                            onClick={() => deleteDirectoryRole(role)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 overflow-x-auto">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm">
                Configurable permission matrix
              </h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="p-2">Role</th>
                  {permissionModules.map((module) => (
                    <th
                      key={module}
                      className="p-2 text-[10px] [writing-mode:vertical-rl]"
                    >
                      {module}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {directoryRoles.map((role) => (
                  <tr key={role.value}>
                    <td className="p-2 font-bold whitespace-nowrap">
                      {role.label}
                    </td>
                    {permissionModules.map((module) => (
                      <td key={module} className="p-2 text-center">
                        {role.permissions.includes(module) ? (
                          <span className="text-emerald-600 font-black">✓</span>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              [
                "Active accounts",
                users.filter((user) => user.status === "active").length,
              ],
              [
                "Suspended accounts",
                users.filter((user) => user.status === "suspended").length,
              ],
              [
                "Security events",
                auditLogs.filter((log) =>
                  /LOGIN|PASSWORD|FORCE_LOGOUT|SUSPEND/.test(log.action),
                ).length,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="bg-white border border-neutral-200 rounded-xl p-4"
              >
                <span className="text-neutral-500">{label}</span>
                <strong className="block text-2xl mt-1">{value}</strong>
              </div>
            ))}
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-sm">Login and session policy</h3>
            <label className="block">
              Password minimum length
              <input
                type="number"
                value={settings.security.passwordMinLength}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      passwordMinLength: Number(event.target.value),
                    },
                  })
                }
                className="block border border-neutral-300 rounded px-2 py-1 mt-1"
              />
            </label>
            <label className="block">
              Session timeout in minutes
              <input
                type="number"
                value={settings.security.sessionTimeoutMinutes}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      sessionTimeoutMinutes: Number(event.target.value),
                    },
                  })
                }
                className="block border border-neutral-300 rounded px-2 py-1 mt-1"
              />
            </label>
            <label className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={settings.security.requireSpecialChar}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      requireSpecialChar: event.target.checked,
                    },
                  })
                }
              />{" "}
              Require special character
            </label>
            <label className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={settings.security.twoFactorRequiredForAdmins}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      twoFactorRequiredForAdmins: event.target.checked,
                    },
                  })
                }
              />{" "}
              Require 2FA for administrators
            </label>
            <p className="text-neutral-500">
              Emergency global session revocation and trusted-device controls
              are recorded as security audit events through the same action log.
            </p>
          </div>
        </div>
      )}

      {tab === "system" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-sm">Marketplace feature flags</h3>
            {Object.entries(platformFlags).map(([key, enabled]) => (
              <label
                key={key}
                className="flex justify-between items-center border-b border-neutral-100 py-2 capitalize"
              >
                <span>{key.replace(/([A-Z])/g, " $1")}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setFlag(key, event.target.checked)}
                />
              </label>
            ))}
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-sm">
              Notifications, integrations and maintenance
            </h3>
            {Object.entries(notificationChannels).map(([key, enabled]) => (
              <label
                key={key}
                className="flex justify-between items-center border-b border-neutral-100 py-2 capitalize"
              >
                <span>{key} notifications</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setChannel(key, event.target.checked)}
                />
              </label>
            ))}
            <p className="font-semibold mt-3">Integrations</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "M-Pesa",
                "Email provider",
                "SMS provider",
                "WhatsApp",
                "Delivery provider",
                "Storage",
              ].map((integration) => (
                <div
                  key={integration}
                  className="border border-neutral-200 rounded p-2 flex justify-between"
                >
                  <span>{integration}</span>
                  <span className="text-emerald-700">Configured</span>
                </div>
              ))}
            </div>
            <label className="flex gap-2 items-center mt-2">
              <input
                type="checkbox"
                checked={settings.maintenance.isMaintenanceMode}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    maintenance: {
                      ...settings.maintenance,
                      isMaintenanceMode: event.target.checked,
                    },
                  })
                }
              />{" "}
              Enable maintenance mode
            </label>
            <input
              value={settings.maintenance.maintenanceMessage}
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  maintenance: {
                    ...settings.maintenance,
                    maintenanceMessage: event.target.value,
                  },
                })
              }
              className="w-full border border-neutral-300 rounded px-2 py-2"
              placeholder="Maintenance message"
            />
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
          <div className="p-4 border-b border-neutral-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-sm">Immutable activity history</h3>
            <span className="text-neutral-500">{auditLogs.length} records</span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-neutral-50 uppercase text-[10px] text-neutral-500">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {auditLogs.slice(0, 100).map((log) => (
                <tr key={log.id}>
                  <td className="p-3 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3">{log.userName}</td>
                  <td className="p-3 font-semibold">{log.action}</td>
                  <td className="p-3">
                    {log.entity} / {log.entityId}
                  </td>
                  <td className="p-3 text-neutral-500">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
