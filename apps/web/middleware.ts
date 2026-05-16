import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@vertechie/db";
import type { AppRole } from "@vertechie/types";

const protectedPrefixes = ["/learning", "/timesheets", "/accounts", "/admin", "/hr", "/supervisor"];

export function canAccessPath(role: AppRole, pathname: string) {
  const isSupervisorTimesheetReview = pathname.startsWith("/accounts/timesheets");
  if (pathname.startsWith("/accounts")) {
    return ["super_admin", "admin", "company_admin", "accounts_manager"].includes(role) || (isSupervisorTimesheetReview && ["team_lead", "operations"].includes(role));
  }
  if (pathname.startsWith("/admin")) return ["super_admin", "admin", "company_admin"].includes(role);
  if (pathname.startsWith("/hr")) return ["super_admin", "admin", "company_admin", "hr"].includes(role);
  if (pathname.startsWith("/supervisor")) return ["super_admin", "admin", "company_admin", "hr", "team_lead", "operations"].includes(role);
  return true;
}

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.headers.set("x-request-id", requestId);

  if (!protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return response;
  }

  const token = request.cookies.get("sb-access-token")?.value;
  if (!token) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));

  const supabase = createServerSupabaseClient(token);
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (!profile) return NextResponse.redirect(new URL("/login", request.url));

  if (!canAccessPath(profile.role, request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/timesheets", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/learning/:path*", "/learning", "/timesheets/:path*", "/accounts/:path*", "/admin/:path*", "/hr/:path*", "/supervisor/:path*"]
};
