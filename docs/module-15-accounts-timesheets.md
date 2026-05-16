# Module 15: Accounts Manager Role and Timesheet Management

## Architecture

Module 15 is implemented in the required sequence: Supabase schema, RLS, backend contracts, API routes, middleware, frontend pages, hooks, notifications, tests, and deployment notes. The feature is entity-scoped by default. Employees can create, edit, submit, and attach files to their own draft or correction-requested timesheets. Accounts Managers can view submitted entity timesheets, approve, reject, request corrections, download signed attachments, export payroll CSVs, and see reporting metrics without receiving unrestricted admin access.

## Database Schema

Migrations live in `supabase/migrations`:

- `20260514174500_core_identity_timesheets.sql`: roles, entities, profiles, employees, permissions, role permissions, timesheets, entries, attachments, activity, notifications, audit logs, indexes, triggers, and total-hour recalculation.
- `20260514174600_timesheet_rls_storage_permissions.sql`: RLS functions, table policies, private storage buckets, and storage object policies.
- `20260514174700_timesheet_seed_permissions.sql`: VerTechie entities, Accounts Manager role permissions, employee permissions, and viewer read rules.

Every application-owned table includes `entity_id`, `created_by`, `updated_by`, `created_at`, `updated_at`, and soft-delete metadata where the table is operational.

## RLS Policies

RLS enforces:

- Employee self-service for own timesheets and attachments.
- Entity-scoped Accounts Manager access for review, correction, rejection, approval, attachment view, and export.
- Admin and Super Admin expanded visibility.
- Signed URL access only for private `timesheet-attachments`.

## TypeScript and Validation

Shared contracts live in `packages/types/src/index.ts`. Zod validates create, update, list, review, and attachment metadata payloads. RBAC role permissions live in `packages/auth/src/index.ts`.

## Backend Services and API Routes

Service and repository files:

- `apps/web/lib/timesheet-repository.ts`
- `apps/web/lib/timesheet-service.ts`
- `apps/web/lib/request-context.ts`
- `apps/web/lib/audit.ts`
- `apps/web/lib/notifications.ts`

Routes:

- `POST /api/timesheets`
- `GET /api/timesheets`
- `GET /api/timesheets/:id`
- `PATCH /api/timesheets/:id`
- `POST /api/timesheets/:id/submit`
- `POST /api/timesheets/:id/approve`
- `POST /api/timesheets/:id/reject`
- `POST /api/timesheets/:id/request-correction`
- `POST /api/timesheets/:id/attachments`
- `GET /api/timesheets/:id/export`
- `GET /api/accounts/timesheets`
- `GET /api/accounts/timesheets/reports`
- `GET /api/accounts/timesheets/export`

All routes use authentication, entity validation, RBAC, Zod validation, structured responses, request IDs, service-layer transitions, audit logging, and centralized error handling.

## Frontend

Employee pages:

- `/timesheets`
- `/timesheets/new`
- `/timesheets/[id]`

Accounts Manager pages:

- `/accounts/timesheets`
- `/accounts/timesheets/[id]`
- `/accounts/reports`

The UI includes weekly/monthly selection, calendar day entries, billable toggles, notes, attachment upload, signed URL downloads, review actions, filters, payroll export, entity summaries, client summaries, loading states, and error states.

## Notifications

In-app and email notification records are written for submit, approve, reject, and correction-requested events. `supabase/functions/timesheet-notifications` processes email notifications via Resend when `RESEND_API_KEY` is configured. Slack and Teams are reserved channels in the notification schema.

## Deployment Notes

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` for email delivery

Deployment flow:

1. Apply Supabase migrations.
2. Deploy the `timesheet-notifications` Edge Function.
3. Configure private storage buckets from migrations.
4. Deploy `apps/web` to Vercel.
5. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` in CI.

## Master Prompt Updates

The platform role list now includes `accounts_manager`. Dashboard requirements include pending timesheets, approved billable hours, rejected/correction-required timesheets, entity-wise hours, client-wise approved hours, and payroll-ready export summaries. Employee lifecycle includes weekly/monthly timesheet submission and correction workflows. Reporting modules include Accounts Manager payroll-supporting exports and leadership entity-wise timesheet visibility.
