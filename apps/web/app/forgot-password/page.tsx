import { AuthShell } from "@/components/AuthShell";
import { Suspense } from "react";

export default function ForgotPasswordPage() {
  return <Suspense><AuthShell mode="forgot" /></Suspense>;
}
