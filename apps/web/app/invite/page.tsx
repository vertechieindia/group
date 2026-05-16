import { AuthShell } from "@/components/AuthShell";
import { Suspense } from "react";

export default function InvitePage() {
  return <Suspense><AuthShell mode="invite" /></Suspense>;
}
