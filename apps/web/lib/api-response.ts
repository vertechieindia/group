import { NextResponse } from "next/server";
import type { ApiResponse } from "@vertechie/types";

export function ok<T>(data: T, requestId: string, meta: Record<string, unknown> = {}) {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    data,
    meta: { requestId, ...meta },
    error: null
  });
}

export function fail(code: string, message: string, requestId: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      data: null,
      meta: { requestId },
      error: { code, message, details }
    },
    { status }
  );
}

export function getRequestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}
