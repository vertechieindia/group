import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VerTechie Group Workforce OS",
  description: "Enterprise workforce, HR, ATS, attendance, and timesheet operations platform.",
  icons: {
    icon: [
      { url: "/logos/vertechie-logo.jpg", type: "image/jpeg" }
    ],
    shortcut: [{ url: "/logos/vertechie-logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/logos/vertechie-logo.jpg", type: "image/jpeg" }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
