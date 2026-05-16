"use client";

import type { ApiResponse, CreateTimesheetInput, ListTimesheetsInput, ReviewTimesheetInput, Timesheet, TimesheetContext, TimesheetReport, UpdateTimesheetInput } from "@vertechie/types";

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

export function queryString(filters: ListTimesheetsInput = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const timesheetApi = {
  context: () => request<TimesheetContext>("/api/timesheets/context"),
  list: (filters?: ListTimesheetsInput) => request<Timesheet[]>(`/api/timesheets${queryString(filters)}`),
  listForAccounts: (filters?: ListTimesheetsInput) => request<Timesheet[]>(`/api/accounts/timesheets${queryString(filters)}`),
  get: (id: string) => request<Timesheet>(`/api/timesheets/${id}`),
  create: (input: CreateTimesheetInput) => request<Timesheet>("/api/timesheets", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: UpdateTimesheetInput) => request<Timesheet>(`/api/timesheets/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  submit: (id: string) => request<Timesheet>(`/api/timesheets/${id}/submit`, { method: "POST" }),
  approve: (id: string, input: ReviewTimesheetInput) => request<Timesheet>(`/api/timesheets/${id}/approve`, { method: "POST", body: JSON.stringify(input) }),
  reject: (id: string, input: ReviewTimesheetInput) => request<Timesheet>(`/api/timesheets/${id}/reject`, { method: "POST", body: JSON.stringify(input) }),
  requestCorrection: (id: string, input: ReviewTimesheetInput) => request<Timesheet>(`/api/timesheets/${id}/request-correction`, { method: "POST", body: JSON.stringify(input) }),
  paymentReceived: (id: string, input: ReviewTimesheetInput) => request<Timesheet>(`/api/timesheets/${id}/payment-received`, { method: "POST", body: JSON.stringify(input) }),
  employeePaid: (id: string, input: ReviewTimesheetInput) => request<Timesheet>(`/api/timesheets/${id}/employee-paid`, { method: "POST", body: JSON.stringify(input) }),
  deleteForRefill: (id: string, input: ReviewTimesheetInput) => request<Timesheet>(`/api/timesheets/${id}/delete-for-refill`, { method: "POST", body: JSON.stringify(input) }),
  attach: (id: string, input: unknown) => request<Timesheet>(`/api/timesheets/${id}/attachments`, { method: "POST", body: JSON.stringify(input) }),
  reports: (filters?: ListTimesheetsInput) => request<TimesheetReport>(`/api/accounts/timesheets/reports${queryString(filters)}`)
};
