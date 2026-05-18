"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateDiscordGroupInput, CreateLearningMaterialInput, CreateOfferTemplateInput, CreateOnboardingFormTemplateInput, CreateOnboardingInviteInput, CreateProjectAssignmentInput, SendOfferLetterInput, TerminateEmployeeInput, UpdateEmployeeLifecycleInput, UpdateLearningAssignmentInput } from "@vertechie/types";
import { lifecycleApi } from "./api";

export function useLifecycleEmployees(entityId?: string, enabled = true) {
  return useQuery({ queryKey: ["lifecycle-employees", entityId ?? "all"], queryFn: () => lifecycleApi.employees(entityId), enabled });
}

export function useUpdateLifecycleEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeLifecycleInput) => lifecycleApi.updateEmployee(input),
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["lifecycle-employees", input.entityId] })
  });
}

export function useTerminateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, input }: { employeeId: string; input: TerminateEmployeeInput }) => lifecycleApi.terminateEmployee(employeeId, input),
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ["lifecycle-employees", variables.input.entityId] })
  });
}

export function useOnboardingInvites(entityId?: string) {
  return useQuery({ queryKey: ["onboarding-invites", entityId], queryFn: () => lifecycleApi.onboardingInvites(entityId), enabled: Boolean(entityId) });
}

export function useCreateOnboardingInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOnboardingInviteInput) => lifecycleApi.createOnboardingInvite(input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-invites", input.entityId] });
      queryClient.invalidateQueries({ queryKey: ["lifecycle-employees", input.entityId] });
    }
  });
}

export function useOnboardingFormTemplates(entityId?: string) {
  return useQuery({ queryKey: ["onboarding-form-templates", entityId], queryFn: () => lifecycleApi.onboardingFormTemplates(entityId), enabled: Boolean(entityId) });
}

export function useCreateOnboardingFormTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOnboardingFormTemplateInput) => lifecycleApi.createOnboardingFormTemplate(input),
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["onboarding-form-templates", input.entityId] })
  });
}

export function useOfferTemplates(entityId?: string) {
  return useQuery({ queryKey: ["offer-templates", entityId], queryFn: () => lifecycleApi.offerTemplates(entityId), enabled: Boolean(entityId) });
}

export function useCreateOfferTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOfferTemplateInput) => lifecycleApi.createOfferTemplate(input),
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["offer-templates", input.entityId] })
  });
}

export function useSendOfferLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendOfferLetterInput) => lifecycleApi.sendOfferLetter(input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["offer-templates", input.entityId] });
      queryClient.invalidateQueries({ queryKey: ["lifecycle-employees", input.entityId] });
    }
  });
}

export function useLearningMaterials(entityId?: string) {
  return useQuery({ queryKey: ["learning-materials", entityId], queryFn: () => lifecycleApi.learningMaterials(entityId), enabled: Boolean(entityId) });
}

export function useCreateLearningMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLearningMaterialInput) => lifecycleApi.createLearningMaterial(input),
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["learning-materials", input.entityId] })
  });
}

export function useDiscordGroups(entityId?: string) {
  return useQuery({ queryKey: ["discord-groups", entityId], queryFn: () => lifecycleApi.discordGroups(entityId), enabled: Boolean(entityId) });
}

export function useCreateDiscordGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDiscordGroupInput) => lifecycleApi.createDiscordGroup(input),
    onSuccess: (_, input) => queryClient.invalidateQueries({ queryKey: ["discord-groups", input.entityId] })
  });
}

export function useMyLearningAssignments() {
  return useQuery({ queryKey: ["my-learning-assignments"], queryFn: () => lifecycleApi.myLearningAssignments() });
}

export function useUpdateLearningAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLearningAssignmentInput) => lifecycleApi.updateLearningAssignment(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-learning-assignments"] })
  });
}

export function useInvoices(entityId?: string) {
  return useQuery({ queryKey: ["invoices", entityId], queryFn: () => lifecycleApi.invoices(entityId), enabled: Boolean(entityId) });
}

export function useProjectAssignments(entityId?: string) {
  return useQuery({ queryKey: ["project-assignments", entityId], queryFn: () => lifecycleApi.projectAssignments(entityId), enabled: Boolean(entityId) });
}

export function useCreateProjectAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectAssignmentInput) => lifecycleApi.createProjectAssignment(input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["project-assignments", input.entityId] });
      queryClient.invalidateQueries({ queryKey: ["lifecycle-employees", input.entityId] });
      queryClient.invalidateQueries({ queryKey: ["timesheet-context"] });
    }
  });
}
