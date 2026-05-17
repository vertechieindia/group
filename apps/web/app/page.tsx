import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, BriefcaseBusiness, CheckCircle2, Clock3, FileText, UsersRound } from "lucide-react";
import { Button } from "@vertechie/ui";

const modules = [
  { icon: UsersRound, label: "Employee lifecycle", value: "Profiles, onboarding, documents, supervisors, and workforce categories in one place." },
  { icon: BriefcaseBusiness, label: "Recruiting operations", value: "Candidate intake, recruiter assignment, pipeline tracking, interviews, and offer workflows." },
  { icon: Clock3, label: "Time and payroll support", value: "Weekly and monthly timecards, approvals, payroll-ready exports, and client invoicing inputs." },
  { icon: BarChart3, label: "Leadership dashboards", value: "Operational visibility across employees, onboarding, recruiting, productivity, and utilization." },
  { icon: FileText, label: "Offer and document center", value: "Company-branded offer letters, HR templates, employee documents, and signed file access." },
  { icon: CheckCircle2, label: "Learning and approvals", value: "Supervisor-led learning materials, acknowledgements, review queues, and workflow follow-through." }
];

const platformHighlights = [
  "Company-branded employee portals",
  "Role-aware dashboards for HR, accounts, supervisors, recruiters, and leadership",
  "Offer letters, onboarding forms, learning materials, and timesheets connected to the same employee record",
  "Payroll and invoicing support from approved hours, project assignments, and account manager review"
];

const workflowCards = [
  { label: "Hire", value: "Invite employees, collect onboarding data, verify documents, and prepare offer letters." },
  { label: "Manage", value: "Assign supervisors, categories, projects, learning material, and employee lifecycle status." },
  { label: "Collect", value: "Employees submit weekly or monthly timecards with projects, leave, holidays, and attachments." },
  { label: "Approve", value: "Supervisors and accounts managers review, correct, approve, export, invoice, and close payroll support." }
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
              <Image alt="VerTechie Group LLC" className="size-8 object-contain" height={40} src="/logos/vertechie-logo.jpg" width={40} priority />
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-wide text-primary">VerTechie Group LLC</span>
              <span className="block text-xs text-muted-foreground">Workforce Operating System</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#platform">Platform</a>
            <a href="#features">Features</a>
            <a href="#workflows">Workflows</a>
          </nav>
          <Link className="inline-flex h-10 items-center rounded-md border border-border bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-muted" href="/login">Sign in</Link>
        </header>

        <div className="relative mx-auto grid min-h-[calc(94vh-82px)] max-w-7xl items-center gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/82 px-3 py-1 text-sm font-medium text-primary shadow-sm backdrop-blur">
              <CheckCircle2 className="size-4" /> Enterprise HRMS, ATS, workforce, and payroll operations
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Workforce command center for growing teams.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              VerTechie Group LLC SaaS brings HR, recruiting, onboarding, employee lifecycle, learning, timesheets, payroll support, client invoicing inputs, and executive reporting into one operating system.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login"><Button className="h-12 px-5 text-base">Sign in <ArrowRight className="size-4" /></Button></Link>
              <Link className="inline-flex h-12 items-center rounded-md border border-border bg-white px-5 text-base font-semibold shadow-sm transition hover:bg-muted" href="/timesheets">Open Workforce OS</Link>
            </div>
            <div className="mt-10 grid max-w-2xl gap-3 rounded-lg border border-border bg-white/86 p-4 shadow-sm backdrop-blur sm:grid-cols-3">
              <div>
                <div className="text-sm font-semibold">HR operations</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">Onboarding, employees, offers, documents, and lifecycle control.</div>
              </div>
              <div>
                <div className="text-sm font-semibold">Workforce time</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">Timesheets, leave, holidays, approvals, payroll, and invoicing.</div>
              </div>
              <div>
                <div className="text-sm font-semibold">Executive clarity</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">Dashboards for company, people, recruiting, and productivity metrics.</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-xl border border-border bg-white p-4 shadow-2xl shadow-slate-900/10">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="text-sm font-semibold">VerTechie Group LLC SaaS</div>
                  <div className="text-xs text-muted-foreground">Workforce Operating System</div>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Live workspace</span>
              </div>
              <div className="mt-4 grid gap-3">
                {platformHighlights.map((item) => (
                  <div className="rounded-lg border border-border bg-background/70 p-4" key={item}>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div className="text-sm font-medium leading-6">{item}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-semibold">Built for complete workforce operations.</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Run the full employee journey from invitation to onboarding, offer generation, supervisor assignment, learning, time capture, approval, payroll support, billing input, and leadership visibility.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workflowCards.map((item) => (
              <div className="rounded-lg border border-border bg-white p-5 shadow-sm" key={item.label}>
                <div className="text-sm font-semibold uppercase text-primary">{item.label}</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-border bg-white">
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

      <section id="workflows" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Operational visibility</p>
              <h2 className="mt-3 text-3xl font-semibold">Everything leadership needs to run workforce operations.</h2>
              <p className="mt-3 text-muted-foreground">
                Track hiring, onboarding, employee readiness, timesheet collection, pending approvals, payroll-ready hours, client billing inputs, and workforce utilization from one workspace.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {["Active employees", "Pending onboarding", "Recruiter activity", "Submitted timesheets", "Approved billable hours", "Payroll and invoice exports"].map((item) => (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-3 text-sm font-medium" key={item}>
                  <CheckCircle2 className="size-4 text-primary" /> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
