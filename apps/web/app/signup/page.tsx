import { AuthShell } from "@/components/AuthShell";
import { Suspense } from "react";

export default function SignupPage() {
  return <Suspense><AuthShell mode="signup" /></Suspense>;
}
