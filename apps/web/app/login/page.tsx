import { AuthShell } from "@/components/AuthShell";
import { Suspense } from "react";

export default function LoginPage() {
  return <Suspense><AuthShell mode="login" /></Suspense>;
}
