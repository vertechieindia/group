import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export function redirectCompanyRoute(company: string, targetPath: string) {
  const hasSession = Boolean(cookies().get("sb-access-token")?.value);
  if (hasSession) redirect(targetPath);
  redirect(`/login?next=${encodeURIComponent(targetPath)}&company=${encodeURIComponent(company)}`);
}
