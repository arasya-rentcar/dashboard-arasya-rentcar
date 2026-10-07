# CLAUDE.md — dashboard-arasya-rentcar

Admin dashboard: Next.js 16 (app router, client components), TanStack Query, axios, react-hook-form + zod, shadcn/ui, next-intl (`messages/id.json` + `messages/en.json`).

## Commands
- `npm ci`, `npx tsc --noEmit`, `npx next build` (both must pass before pushing)
- API base: `NEXT_PUBLIC_API_URL` (build-time; production `https://api.haikuy.com/api/v1`). `NEXT_PUBLIC_WA_DELIVERY=bot` only if the old bot is still used (default manual).

## Layout & patterns
- Pages in `app/dashboard/*` (leads, orders, orders/[id], schedule, customers, customers/[id], drivers, cars, etoll-cards (+ [id]: office e-toll card pool, history, top-up/balance/toll entries, give/return), notifications (bell feed + driver top-up requests: "Tandai sudah top-up" records card + amount), external (partners), invoices, payables, revenue, guide, agent).
- API client `lib/api.ts` (one object per resource), hooks in `hooks/use*.ts` (invalidate every related query key), types in `types/index.ts`, response schemas `lib/schemas.ts` (`.passthrough()`).
- Every UI string goes through next-intl with **both** id and en keys; Indonesian must sound natural (the admin team is Indonesian).
- Dates: use the WIB helpers in `lib/utils.ts` (`wibDateTimeToIso`, `wibDateToIso`, `isoToWibDateTimeLocal`, `isoToWibDate`, `formatDateTime`). Never `new Date(localString)` or `toISOString().slice(0,10)` for business dates.
- WhatsApp sends: `lib/waWindow.ts` opens the returned `wa_url` (pre-opens a tab in manual mode to avoid popup blocking).
- Status colours: `lib/statusStyles.ts`; line statuses include ASSIGNED.
- Customer identity: NIK full only on the customer detail page; documents opened via fresh signed URL per click, never cached.
- The orders page reads `?lead=<id>` once into state (the filter hook rewrites the URL).

## Visual checks
Playwright is a devDependency; launch Chromium with `executablePath: '/opt/pw-browsers/chromium'`. For pages that need data, build against a throwaway node mock API (`NEXT_PUBLIC_API_URL=http://localhost:<port>/api/v1 npx next build && npx next start -p 3100`). Stop servers by PID; `ss` is not installed (use `ps -eo pid,args`).

## Deploy
- Push to `main` → `vercel.yml` deploys the Vercel copy and `deploy.yml` deploys the VPS copy over SSH (secrets `SSH_HOST`, `SSH_USER`, `SSH_PORT`, `SSH_DEPLOY_KEY`; only when dashboard code paths change, or run it manually).
- dashboard.haikuy.com (what admins use) is the VPS copy; `deploy.yml` runs `cd /root/.openclaw/workspace/arasya-projects && GIT_SYNC=1 ./deploy-local.sh dashboard`.
- Release the dashboard only after the API it depends on is deployed.
- Work happens on `claude/trusting-dijkstra-hocd9x`; fast-forward `main` to release.

## Docs
- `docs/BACKLOG.md` deferred items (price list, area master, service enums, real fleet seed).
- `docs/HANDOFF.md` latest state of all repos and open actions.

## Arasya system map (same section in all four repos)

Arasya Rent Car: car rental **with driver**, Bogor HQ, Indonesia. Legal entity **PT Ayomi Raya Karsa**. Brand name "Arasya Rent Car". Official WhatsApp 0821-2402-4281.

| Repo | What | Deploys to |
|---|---|---|
| `arasya-rentcar/arasya-web` | Marketing website (Astro + Sanity), booking form → lead | Vercel (push to `main`), arasya-web.vercel.app |
| `arasya-rentcar/api-arasya-rentcar` | Express + Prisma API, source of truth (Postgres + Storage on Supabase) | VPS via `deploy-local.sh api`, https://api.haikuy.com |
| `arasya-rentcar/dashboard-arasya-rentcar` | Admin dashboard (Next.js) | Vercel (push to `main`) **and** VPS `deploy-local.sh dashboard` → dashboard.haikuy.com |
| `arasya-rentcar/mobile-arasya-rentcar` | Driver app (Expo, Android first) | EAS build (APK) |
| `arasya-rentcar/wa-bot-arasya` (branch `development`) | Old WhatsApp bot (whatsapp-web.js) | **Being retired**, do not extend |

Flow: website form → `POST /api/v1/public/leads` (code `ARS-XXXXX`, also sent in the WhatsApp message and GA4 `generate_lead`) → dashboard "Lead Website" → order (order_code = lead code) → schedule lines assigned to drivers → driver app (accept / start / arrive / finish / reports) → invoices (DP ≥ 20%) → first PAID invoice sends GA4 `purchase` (Measurement Protocol).

Rules that apply everywhere:
- **Time is WIB (Asia/Jakarta, +07:00).** Never derive dates from `toISOString()` or the browser timezone; build `…T00:00:00+07:00` / `…:00+07:00` explicitly.
- **Payments only to BCA 0954840782 a.n. PT Ayomi Raya Karsa.** No personal accounts anywhere (captions, PDFs, site).
- **Cancellation (as enforced by `computeCancellationPenalty`):** before the travel day 20% of the order total; day H sebelum pukul 10.00 WIB and trip not started 50%; mulai pukul 10.00 WIB (10:00:00 included) or once the trip has started 100%. Website text, captions and PDFs must say the same.
- **Personal data:** NIK and KTP/document files are sensitive (UU PDP). Lists show masked NIK only; documents live in the private bucket and are served by 5-minute signed URLs; never return a full customer object from endpoints that don't need it.
- **Idempotency:** client-generated `client_ref` (uuid) + guarded conditional updates; resends must be no-ops.
- **WhatsApp:** default is manual mode (`WA_DELIVERY` unset/manual): the API returns `wa_url` links the admin opens; driver messages go to the app as push. `WA_DELIVERY=bot` only while the old bot still runs.
- Commits end with the trailers given by the session; never put model names in code or commits. Secrets never in chat or git.
- Deferred work lives in `dashboard-arasya-rentcar/docs/BACKLOG.md`; the latest handoff in `dashboard-arasya-rentcar/docs/HANDOFF.md`.
