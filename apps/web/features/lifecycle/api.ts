"use client";

import type {
  ApiResponse,
  CreateDiscordGroupInput,
  CreateLearningMaterialInput,
  CreateOfferTemplateInput,
  CreateOnboardingFormTemplateInput,
  CreateOnboardingInviteInput,
  CreateProjectAssignmentInput,
  DiscordLearningGroup,
  EmployeeLearningAssignment,
  InvoiceSummary,
  LearningMaterial,
  LifecycleEmployee,
  OfferTemplate,
  OnboardingInvite,
  OnboardingFormTemplate,
  ProjectAssignment,
  SendOfferLetterInput,
  SentOfferLetter,
  TerminateEmployeeInput,
  UpdateLearningAssignmentInput,
  UpdateEmployeeLifecycleInput
} from "@vertechie/types";
import { queryString } from "@/features/timesheets/api";

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

export const lifecycleApi = {
  employees: (entityId?: string) => request<LifecycleEmployee[]>(`/api/hr/employees${queryString({ entityId })}`),
  updateEmployee: (input: UpdateEmployeeLifecycleInput) => request<LifecycleEmployee>("/api/hr/employees", { method: "PATCH", body: JSON.stringify(input) }),
  terminateEmployee: (employeeId: string, input: TerminateEmployeeInput) => request<{ terminated: boolean; emailDeliveryStatus?: string; emailDeliveryError?: string | null }>(`/api/hr/employees/${employeeId}/terminate`, { method: "PATCH", body: JSON.stringify(input) }),
  onboardingInvites: (entityId?: string) => request<OnboardingInvite[]>(`/api/hr/onboarding-invites${queryString({ entityId })}`),
  createOnboardingInvite: (input: CreateOnboardingInviteInput) => request<OnboardingInvite>("/api/hr/onboarding-invites", { method: "POST", body: JSON.stringify(input) }),
  onboardingFormTemplates: (entityId?: string) => request<OnboardingFormTemplate[]>(`/api/hr/onboarding-form-templates${queryString({ entityId })}`),
  createOnboardingFormTemplate: (input: CreateOnboardingFormTemplateInput) => request<OnboardingFormTemplate>("/api/hr/onboarding-form-templates", { method: "POST", body: JSON.stringify(input) }),
  offerTemplates: (entityId?: string) => request<OfferTemplate[]>(`/api/hr/offer-templates${queryString({ entityId })}`),
  createOfferTemplate: (input: CreateOfferTemplateInput) => request<OfferTemplate>("/api/hr/offer-templates", { method: "POST", body: JSON.stringify(input) }),
  sendOfferLetter: (input: SendOfferLetterInput) => request<SentOfferLetter>("/api/hr/offer-letters/send", { method: "POST", body: JSON.stringify(input) }),
  learningMaterials: (entityId?: string) => request<LearningMaterial[]>(`/api/hr/learning-materials${queryString({ entityId })}`),
  createLearningMaterial: (input: CreateLearningMaterialInput) => request<LearningMaterial>("/api/hr/learning-materials", { method: "POST", body: JSON.stringify(input) }),
  discordGroups: (entityId?: string) => request<DiscordLearningGroup[]>(`/api/supervisor/discord-groups${queryString({ entityId })}`),
  createDiscordGroup: (input: CreateDiscordGroupInput) => request<DiscordLearningGroup>("/api/supervisor/discord-groups", { method: "POST", body: JSON.stringify(input) }),
  myLearningAssignments: () => request<EmployeeLearningAssignment[]>("/api/learning/assignments"),
  updateLearningAssignment: (input: UpdateLearningAssignmentInput) => request<EmployeeLearningAssignment>("/api/learning/assignments", { method: "PATCH", body: JSON.stringify(input) }),
  invoices: (entityId?: string) => request<InvoiceSummary[]>(`/api/accounts/invoices${queryString({ entityId })}`),
  projectAssignments: (entityId?: string) => request<ProjectAssignment[]>(`/api/accounts/project-assignments${queryString({ entityId })}`),
  createProjectAssignment: (input: CreateProjectAssignmentInput) => request<ProjectAssignment>("/api/accounts/project-assignments", { method: "POST", body: JSON.stringify(input) })
};
