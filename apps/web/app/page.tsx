import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, BriefcaseBusiness, CheckCircle2, Clock3, FileText, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@vertechie/ui";

const entities = [
  {
    name: "VerTechie LLC",
    logo: "/logos/vertechie-logo.jpg",
    summary: "IT services and consulting, listed publicly as VerTechie on LinkedIn.",
    sourceLabel: "LinkedIn company profile",
    sourceUrl: "https://www.linkedin.com/company/vertechie"
  },
  {
    name: "Code4U.AI",
    logo: "/logos/code4u-ai.jpg",
    summary: "Web, mobile, consulting, and software development services.",
    sourceLabel: "code4u.app",
    sourceUrl: "https://code4u.app/"
  },
  {
    name: "XeroBookz",
    logo: "/logos/xerobookz.jpg",
    summary: "Founder profile lists XeroBookz as an early-stage venture focused on operational clarity and scalable product thinking.",
    sourceLabel: "Public founder profile",
    sourceUrl: "https://www.saikrishnareddy.com/about"
  },
  {
    name: "FavNFresh",
    logo: "/logos/favnfresh.jpg",
    summary: "Founder profile lists Fav N Fresh as a consumer-focused business initiative.",
    sourceLabel: "Public founder profile",
    sourceUrl: "https://www.saikrishnareddy.com/about"
  },
  {
    name: "United Bible Hub",
    logo: "/logos/united-bible-hub.jpg",
    summary: "Founder profile lists United Bible Hub with scripture data models, contextual navigation, and cross-reference foundations.",
    sourceLabel: "Public founder profile",
    sourceUrl: "https://www.saikrishnareddy.com/about"
  },
  {
    name: "United Cyber Hub",
    logo: "/logos/united-cyber-hub.png",
    summary: "Cybersecurity services including log management, SIEM readiness, analytics, compliance, and retention architecture.",
    sourceLabel: "unitedcyberhub.com",
    sourceUrl: "https://www.unitedcyberhub.com/services/log-management"
  },
  {
    name: "United SAP Hub",
    logo: "/logos/united-sap-hub.jpg",
    summary: "SAP-focused services and recruiting, including S/4HANA, BW/4HANA, migrations, integrations, and SAP consultant sourcing.",
    sourceLabel: "unitedsap.com",
    sourceUrl: "https://www.unitedsap.com/"
  }
];

const modules = [
  { icon: UsersRound, label: "Employee Operations", value: "Entity-scoped profiles, hierarchy, documents" },
  { icon: BriefcaseBusiness, label: "ATS Pipeline", value: "Candidates, interviews, offers, onboarding" },
  { icon: Clock3, label: "Attendance & Timesheets", value: "Daily hours, approvals, payroll-ready exports" },
  { icon: BarChart3, label: "Executive Visibility", value: "Leadership KPIs across every entity" },
  { icon: FileText, label: "Document Control", value: "Private storage, signed URLs, versioning" },
  { icon: ShieldCheck, label: "Audit & Compliance", value: "RLS, RBAC, activity trails, request IDs" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <section className="relative min-h-[94vh] border-b border-border">
        <div className="enterprise-grid absolute inset-0 opacity-80" />
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f766e,#f59e0b,#2563eb,#7c3aed)]" />
        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid size-11 place-items-center rounded-lg border border-border bg-white shadow-sm">
              <Image alt="VerTechie Group" className="size-8 object-contain" height={40} src="/logos/vertechie-logo.jpg" width={40} priority />
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-wide text-primary">VerTechie Group</span>
              <span className="block text-xs text-muted-foreground">Workforce Operating System</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#entities">Entities</a>
            <a href="#operations">Operations</a>
            <a href="#security">Security</a>
          </nav>
          <Link className="inline-flex h-10 items-center rounded-md border border-border bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-muted" href="/login">Sign in</Link>
        </header>

        <div className="relative mx-auto grid min-h-[calc(94vh-82px)] max-w-7xl items-center gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/82 px-3 py-1 text-sm font-medium text-primary shadow-sm backdrop-blur">
              <CheckCircle2 className="size-4" /> Enterprise HRMS, ATS, workforce, and payroll operations
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Workforce command center for every VerTechie entity.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              One operating layer for employees, recruiting, onboarding, attendance, timesheets, documents, compliance, analytics, and executive visibility across the group.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login"><Button className="h-12 px-5 text-base">Sign in <ArrowRight className="size-4" /></Button></Link>
              <Link className="inline-flex h-12 items-center rounded-md border border-border bg-white px-5 text-base font-semibold shadow-sm transition hover:bg-muted" href="/timesheets">Open Workforce OS</Link>
            </div>
            <div className="mt-10 grid max-w-2xl gap-3 rounded-lg border border-border bg-white/86 p-4 shadow-sm backdrop-blur sm:grid-cols-3">
              <div>
                <div className="text-sm font-semibold">Entity registry</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">Public-source links for every configured brand.</div>
              </div>
              <div>
                <div className="text-sm font-semibold">Live operations</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">Metrics load from authenticated Supabase records only.</div>
              </div>
              <div>
                <div className="text-sm font-semibold">Audit first</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">RBAC, RLS, and request tracing protect workflows.</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-xl border border-border bg-white p-4 shadow-2xl shadow-slate-900/10">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="text-sm font-semibold">Our Products</div>
                  <div className="text-xs text-muted-foreground">VerTechie Group companies and ventures</div>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Product suite</span>
              </div>
              <div className="mt-4 grid gap-3">
                {entities.map((entity) => (
                  <div className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-lg border border-border bg-background/70 p-3" key={entity.name}>
                    <Image alt={entity.name} className="size-11 rounded-md object-contain" height={44} src={entity.logo} width={44} />
                    <div>
                      <div className="font-semibold">{entity.name}</div>
                      <div className="text-xs text-muted-foreground">VerTechie Group product</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="entities" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Entity-aware by design</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">Every entity has isolated employees, candidates, dashboards, timesheets, documents, reporting, and approval workflows.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {entities.map((entity) => (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 shadow-sm" key={entity.name}>
              <Image alt={entity.name} className="size-12 rounded-md object-contain" height={48} src={entity.logo} width={48} />
              <div>
                <div className="font-semibold">{entity.name}</div>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{entity.summary}</p>
                <a className="mt-2 inline-flex text-sm font-semibold text-primary" href={entity.sourceUrl} rel="noreferrer" target="_blank">{entity.sourceLabel}</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="operations" className="border-y border-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {modules.map((module) => (
            <div className="rounded-lg border border-border bg-background/70 p-5" key={module.label}>
              <module.icon className="size-5 text-primary" />
              <h3 className="mt-4 font-semibold">{module.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-slate-950 p-6 text-white md:p-8">
          <div className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-teal-300">Security architecture</p>
              <h2 className="mt-3 text-3xl font-semibold">Private documents, strict RBAC, and auditable workflows.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {["Supabase RLS", "Signed attachment URLs", "Request ID logging", "Entity-scoped permissions", "Audit trails", "MFA-ready auth"].map((item) => (
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm" key={item}>
                  <ShieldCheck className="size-4 text-teal-300" /> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
