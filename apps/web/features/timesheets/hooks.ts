"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTimesheetInput, ListTimesheetsInput, ReviewTimesheetInput, UpdateTimesheetInput } from "@vertechie/types";
import { timesheetApi } from "./api";

export function useTimesheets(filters?: ListTimesheetsInput) {
  return useQuery({ queryKey: ["timesheets", filters], queryFn: () => timesheetApi.list(filters) });
}

export function useTimesheetContext() {
  return useQuery({ queryKey: ["timesheet-context"], queryFn: timesheetApi.context });
}

export function useAccountTimesheets(filters?: ListTimesheetsInput) {
  return useQuery({ queryKey: ["accounts-timesheets", filters], queryFn: () => timesheetApi.listForAccounts(filters) });
}

export function useTimesheet(id: string) {
  return useQuery({ queryKey: ["timesheet", id], queryFn: () => timesheetApi.get(id), enabled: Boolean(id) });
}

export function useTimesheetReports(filters?: ListTimesheetsInput) {
  return useQuery({ queryKey: ["timesheet-reports", filters], queryFn: () => timesheetApi.reports(filters) });
}

export function useCreateTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimesheetInput) => timesheetApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timesheets"] })
  });
}

export function useUpdateTimesheet(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTimesheetInput) => timesheetApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheet", id] });
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    }
  });
}

export function useReviewTimesheet(id: string, action: "approve" | "reject" | "requestCorrection" | "paymentReceived" | "employeePaid" | "deleteForRefill") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewTimesheetInput) => timesheetApi[action](id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheet", id] });
      queryClient.invalidateQueries({ queryKey: ["accounts-timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet-reports"] });
    }
  });
}
