"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button, Card, Input } from "@vertechie/ui";
import { createBrowserSupabaseClient } from "@/features/timesheets/supabase-browser";
import { type ChangeEvent, useEffect, useState } from "react";
import { TenantFavicon } from "@/components/branding/TenantFavicon";

type PublicBranding = {
  brandName: string;
  brandLogoUrl: string | null;
};

export function AuthShell({ mode }: { mode: "login" | "signup" | "forgot" | "invite" }) {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/timesheets";
  const company = searchParams.get("company");
  const [branding, setBranding] = useState<PublicBranding>({ brandName: "VerTechie Group", brandLogoUrl: "/logos/vertechie-logo.jpg" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const title = {
    login: "Sign in",
    signup: "Create account",
    forgot: "Reset password",
    invite: "Accept invite"
  }[mode];

  useEffect(() => {
    if (!company) return;
    fetch(`/api/public/branding?company=${encodeURIComponent(company)}`)
      .then((response) => response.json())
      .then((payload: PublicBranding) => setBranding(payload))
      .catch(() => setBranding({ brandName: "VerTechie Group", brandLogoUrl: "/logos/vertechie-logo.jpg" }));
  }, [company]);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    if (!accessToken) return;

    document.cookie = `sb-access-token=${accessToken}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;
    window.location.assign(nextPath);
  }, [nextPath]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();

      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`
        });
        if (resetError) throw resetError;
        setStatus("Password reset email sent if this address exists.");
        return;
      }

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${nextPath}` }
        });
        if (signUpError) throw signUpError;
        setStatus("Account created. Check email confirmation settings in Supabase before signing in.");
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!data.session?.access_token) throw new Error("Supabase did not return a session.");

      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;
      window.location.assign(nextPath);
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Authentication failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateEmail(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
  }

  function updatePassword(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      <TenantFavicon logoUrl={branding.brandLogoUrl} />
      <div className="enterprise-grid absolute inset-0" />
      <Card className="relative w-full max-w-md p-6 shadow-2xl shadow-slate-900/10">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg border border-border bg-white shadow-sm">
              <Image alt={branding.brandName} className="size-8 object-contain" height={40} src={branding.brandLogoUrl || "/logos/vertechie-logo.jpg"} width={40} priority unoptimized />
            </span>
            <div>
              <div className="text-sm font-semibold text-primary">{branding.brandName}</div>
              <div className="text-xs text-muted-foreground">Workforce OS secure access</div>
            </div>
          </div>
          <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Workforce OS access is protected by Supabase Auth, RBAC, entity scope, and audit logging.</p>
        </div>
        <form className="grid gap-3" onSubmit={submit}>
          <Input autoComplete="email" inputMode="email" required type="text" placeholder="Email" value={email} onChange={updateEmail} />
          {mode !== "forgot" && (
            <Input autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} type="password" placeholder="Password" value={password} onChange={updatePassword} />
          )}
          {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          {status && <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{status}</div>}
          <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Working..." : title}</Button>
        </form>
        <div className="mt-5 flex justify-between text-sm">
          <Link className="text-primary" href="/forgot-password">Forgot password</Link>
          <Link className="text-primary" href="/signup">Sign up</Link>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" /> Entity-aware permissions are enforced before every protected workflow.
        </div>
      </Card>
    </main>
  );
}
