"use client";

import type { AdminCompanyDashboard, AdminUser, ApiResponse, BusinessEntity, CompanyRole, CreateAdminUserInput, CreateCompanyRoleInput, CurrentUser, EntityBrandingInput, UpdateUserPasswordInput } from "@vertechie/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Request failed");
  return payload.data as T;
}

function qs(entityId?: string) {
  return entityId ? `?entityId=${encodeURIComponent(entityId)}` : "";
}

export const adminApi = {
  me: () => request<CurrentUser>("/api/me"),
  dashboard: () => request<AdminCompanyDashboard>("/api/admin/dashboard"),
  entities: () => request<BusinessEntity[]>("/api/admin/entities"),
  users: (entityId?: string) => request<AdminUser[]>(`/api/admin/users${qs(entityId)}`),
  createUser: (input: CreateAdminUserInput) => request<AdminUser>("/api/admin/users", { method: "POST", body: JSON.stringify(input) }),
  updateUserPassword: (userId: string, input: UpdateUserPasswordInput) => request<{ updated: boolean }>(`/api/admin/users/${userId}/password`, { method: "PATCH", body: JSON.stringify(input) }),
  holdCompanyServices: (userId: string) => request<{ updated: boolean }>(`/api/admin/users/${userId}/hold`, { method: "PATCH" }),
  resumeCompanyServices: (userId: string) => request<{ updated: boolean }>(`/api/admin/users/${userId}/resume`, { method: "PATCH" }),
  deleteCompanyAdmin: (userId: string) => request<{ deleted: boolean }>(`/api/admin/users/${userId}`, { method: "DELETE" }),
  roles: (entityId?: string) => request<CompanyRole[]>(`/api/admin/roles${qs(entityId)}`),
  createRole: (input: CreateCompanyRoleInput) => request<CompanyRole>("/api/admin/roles", { method: "POST", body: JSON.stringify(input) }),
  branding: (entityId?: string) => request<BusinessEntity>(`/api/admin/branding${qs(entityId)}`),
  updateBranding: (input: EntityBrandingInput) => request<BusinessEntity>("/api/admin/branding", { method: "PATCH", body: JSON.stringify(input) })
};
