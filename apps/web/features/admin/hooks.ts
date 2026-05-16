"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateAdminUserInput, CreateCompanyRoleInput, EntityBrandingInput, UpdateUserPasswordInput } from "@vertechie/types";
import { adminApi } from "./api";

export function useCurrentUser() {
  return useQuery({ queryKey: ["me"], queryFn: adminApi.me, retry: false });
}

export function useEntities(enabled = true) {
  return useQuery({ queryKey: ["admin-entities"], queryFn: adminApi.entities, enabled });
}

export function useAdminDashboard() {
  return useQuery({ queryKey: ["admin-dashboard"], queryFn: adminApi.dashboard });
}

export function useAdminUsers(entityId?: string) {
  return useQuery({ queryKey: ["admin-users", entityId], queryFn: () => adminApi.users(entityId), enabled: Boolean(entityId) });
}

export function useCompanyRoles(entityId?: string) {
  return useQuery({ queryKey: ["company-roles", entityId], queryFn: () => adminApi.roles(entityId), enabled: Boolean(entityId) });
}

export function useBranding(entityId?: string) {
  return useQuery({ queryKey: ["branding", entityId], queryFn: () => adminApi.branding(entityId), enabled: Boolean(entityId) });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminUserInput) => adminApi.createUser(input),
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["admin-users", input.entityId] })
  });
}

export function useUpdateUserPassword(entityId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateUserPasswordInput }) => adminApi.updateUserPassword(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users", entityId] })
  });
}

export function useCreateCompanyRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyRoleInput) => adminApi.createRole(input),
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["company-roles", input.entityId] })
  });
}

export function useUpdateBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EntityBrandingInput) => adminApi.updateBranding(input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["branding", input.entityId] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });
}
