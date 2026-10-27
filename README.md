# Ledgerly

Personal finance and wealth management with **email/password authentication and private user workspaces**, prepared for Vercel + hosted PostgreSQL.

Next.js 16 App Router, React, strict TypeScript, Tailwind 4, Radix/shadcn-style UI, Prisma 6, Better Auth, Zod, React Hook Form, Recharts, and Decimal.js. INR and Asia/Kolkata reporting are supported.

## Deploy on Vercel

1. Push this project to your Git repository and import it into Vercel as a Next.js project.
2. Create a **new hosted PostgreSQL database** using your preferred provider (for example Neon, Supabase, or Prisma Postgres). Use separate databases for Production and Preview. Never use a local SQLite file or the local PGlite development server on Vercel.
3. Set these **server-side** Vercel environment variables for the environment you will deploy:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Provider's pooled PostgreSQL runtime connection URL. Keep its SSL and pooling options. |
   | `DIRECT_URL` | Provider's direct PostgreSQL migration connection URL. |
   | `BETTER_AUTH_URL` | Exact HTTPS application origin, e.g. `https://your-project.vercel.app` or your custom domain. No extra path. |
   | `BETTER_AUTH_SECRET` | A unique high-entropy random secret, at least 32 characters. Generate locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. |

4. Deploy. `vercel.json` uses `npm run vercel-build`, which validates environment configuration, generates Prisma, applies committed PostgreSQL migrations, then builds Next.js. The deployment creates tables only; it does not create users or financial records.
5. Open `/signup` to create your own account. Registration creates only that user's default categories and preferences. Add your own bank/cash account to get started.
6. Test sign-up, sign-out, sign-in, a transaction, and export at the actual HTTPS URL. If the domain changes, update `BETTER_AUTH_URL` and redeploy.

Do not prefix database URLs or auth secrets with `NEXT_PUBLIC_`. Do not commit `.env` or database files. Vercel's repository and database integration setup remains an owner action; no hosted project or paid resource has been created by this code change.

For PgBouncer transaction-pool endpoints, follow your provider's Prisma 6 connection-string guidance; some require `pgbouncer=true`. Runtime traffic uses `DATABASE_URL`, while Prisma migrations use `DIRECT_URL`. Do not run preview migrations against production data. Provider backup retention, TLS, connection limits, and availability should be configured in the database dashboard.

Production sign-in is restricted to the configured origin by Better Auth; financial writes also check the exact configured origin. Arbitrary preview subdomains are not automatically trusted. For an authenticated preview, explicitly set its exact origin and use an isolated preview database and secret.

## Run locally

Use Node.js 24 LTS and npm. A PostgreSQL-compatible PGlite socket server is included as a **development/test convenience**, so local verification needs no Docker or cloud account. It is a single-connection PostgreSQL engine with a multiplexer and is not the production database.

```powershell
npm run env:setup
npm ci
```

`env:setup` creates `.env` only when absent, generates a private random auth secret, and never overwrites an existing environment file. `.env.example` has the local connection defaults.

Start the database in terminal 1:

```powershell
npm run db:local
```

Then use terminal 2:

```powershell
npm run db:setup
npm run dev
```

Open http://127.0.0.1:3000/signup. The local database lives in ignored `.data/postgres/` and listens on loopback port 5433. Keep the database terminal running while using the app. The local connection URL includes `connection_limit=1&pgbouncer=true&statement_cache_size=0` because multiple Prisma clients share PGlite's underlying connection. A real PostgreSQL service can also be used locally instead.

For local production-mode verification, stop the Next.js dev server first, keep the database running, then:

```powershell
npm run build
npm start
```

Webpack is explicitly selected because Turbopack subprocess initialization failed in the Windows sandbox. On Windows, stop running Next.js/test servers before Prisma generation to avoid locking its native DLL.

## User privacy and authorization

- Better Auth handles sign-up, password hashing, sign-in, database-backed sessions, cookie protection, and sign-out/revocation. Passwords require 12–128 characters. Sessions expire after seven days and are checked against the database; cookie session caching is disabled.
- Auth requests use database-backed rate limiting so limits survive serverless instance changes: 100 requests/minute generally and 10/minute on email sign-in/sign-up. Do not trust custom client-supplied IP forwarding headers in front of the deployment.
- Every financial page calls `requireUser()` before fetching records. The protected workspace layout also requires a session. Unauthenticated pages redirect to `/login`; financial mutation/export APIs return 401.
- Every financial row has a `userId`: accounts, categories, transactions, stocks, deposits, friends, splits, settlements, and preferences.
- Reads, counts, reports, ledger filters, pagination, and exports are scoped to the authenticated session's user ID. Body/query-string `userId` values cannot choose ownership.
- Updates, archives, deletes, and reference selection check the owner. Foreign-user record IDs return a generic 404. Shared names are permitted across different users.
- Composite foreign keys bind linked rows to the same owner: transaction source/destination/category, investment linked account, split account/friend, and settlement split. The database rejects cross-user links even if application validation is bypassed.
- CSV exports require authentication and are returned with `private, no-store`. Auth and financial pages are dynamically rendered. No global cache stores a user's financial data.
- PostgreSQL row-level security is **not** configured. Privacy is enforced through server authorization plus relational ownership constraints. Database credentials and the deployment owner still have administrative access to the database. This is not end-to-end encryption.

Email verification, password-reset email delivery, MFA, and social login are not configured. An email/password account works without any email service; it does not prove control of the email mailbox. Configure a transactional email provider and Better Auth verification/recovery callbacks before relying on email ownership or recovery. Do not promise a recovery email until delivery is configured. No password-reset or email-verification button is exposed in the UI.

## Existing SQLite data

The earlier local SQLite file `prisma/ledgerly.db` is preserved and is no longer read by the application. Its original migrations are archived under `prisma/legacy-sqlite-migrations/`. The `.env` used during implementation retains its old URL as `LEGACY_SQLITE_DATABASE_URL` for reference only; application code never uses it.

The new migration history is PostgreSQL-only and must target a **new PostgreSQL database**. No reset, automatic import, or assignment of old financial records to a new user occurs. If the SQLite file contains personal records, preserve it and arrange an explicit owner-specific import separately. Never point the new migrations at an existing unrelated database or attempt to apply archived SQLite SQL to PostgreSQL.

## Features and accounting

The eight routes remain Overview, Transactions, Monthly Recap, Investments, Splits & Friends, Accounts, Categories, and Settings. They retain account/category editing and archiving, positive validated ledger entries, transfers, duplicate preview, confirmed deletion, search/filter/sort/server pagination, filtered CSV export, consumption/budget analytics, manual stock prices, fixed deposit estimates, partial/full/bulk repayments, persistent themes, and responsive navigation. Settings and application copy now describe private user data and hosted backups.

Each registration creates 11 default expense categories, 5 default income categories, and one preference record. No account, balance, transaction, holding, deposit, friend, or repayment is fabricated. `db:seed` deliberately creates no global defaults; user initialization is a signup hook and runs in a database transaction. `seedUser` is idempotent for initialization/recovery; normal page loads do not rerun it or reintroduce renamed categories.

Account balance = opening balance + income + incoming transfers − expenses − outgoing transfers − investment contributions. One transfer record affects each account once and has no effect on consolidated wealth. Consumption is always an Expense with the consumption flag enabled.

Net worth = all account balances + stock market value + estimated accrued FD value + outstanding receivables. Negative account balances can represent liabilities. Accounts, including investment accounts, represent uninvested cash. **Funding is explicit**: record one Investment ledger contribution when funding a holding/deposit, then add the asset. Linked accounts are references and do not automatically debit cash. When redeeming an FD, record proceeds and mark it Redeemed to exclude its value while preserving details. Archived assets still contribute to net worth.

Splits are receivable subledgers. Record the original full expense and received repayment income separately in the ledger. For personal-only consumption, use a consumption expense for your share and a non-consumption expense for the recoverable share. Repayment income appears in income reports. Individual repayments lock the split row; bulk settlement locks splits in deterministic order before checking/reducing outstanding balances. Repayments cannot exceed the remainder or predate a split.

Money calculations use Decimal.js. Stocks use weighted aggregate return. FD estimates use nominal annual compounding with actual elapsed days / 365, capped at maturity, rounded to paise. Taxes, fees, penalties, live prices, bank sync, multi-currency conversion, and amortization schedules are not modeled. Budget edits affect historical reports; there are no budget snapshots. Split/settlement correction is not exposed through the UI.

## Architecture

| Location | Responsibility |
| --- | --- |
| `prisma/schema.prisma`, `prisma/migrations/` | PostgreSQL auth/financial schema, ownership columns, indexes, composite foreign keys |
| `src/lib/auth.ts`, `src/lib/session.ts` | Better Auth configuration, secure session checks, per-user initialization |
| `src/lib/defaults.ts` | Private default categories and preferences |
| `src/app/login/`, `signup/`, `api/auth/` | Authentication UI and library handlers |
| `src/app/(workspace)/` | Protected application routes and layout |
| `src/lib/services/mutations.ts` | Owner-scoped writes/deletes, reference validation, settlement row locks |
| `src/lib/services/queries.ts` | Owner-scoped ledger filters and form options |
| `src/app/api/[entity]/`, `api/export/` | Authenticated writes and export |
| `src/lib/finance/`, `validations/` | Shared financial engine and Zod schemas |
| `vercel.json`, `.env.example` | Deployment build and required environment configuration |
| `tests/` | Financial, ownership, auth, and browser verification on disposable PostgreSQL-compatible databases |

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Unit/integration tests use in-memory PGlite with PostgreSQL wire connections and apply the committed PostgreSQL SQL migration. They do not connect to the development or hosted database. Ownership tests exercise both service-level checks and composite database constraints.

The browser runner creates a disposable in-memory database, an independent secret, port 3100, and `.next-e2e`. Each browser test resets **only that runner-provided database** and signs up a disposable test account. Microsoft Edge is used; screenshots/traces go to ignored `test-results/`. Auth browser checks include unauthenticated redirects/API rejection, incorrect passwords, signup/signin/signout, revoked-cookie replay, and two simultaneous users attacking each other's records and exports. The existing finance workflows and mobile/theme checks also run after authentication.

The embedded test database's multiplexer is not a substitute for production PostgreSQL concurrency/load testing. Test the configured hosted provider and HTTPS deployment before inviting real users. No hosted deployment has been tested without its owner-provided database and Vercel configuration.

## Backups

Use your hosted PostgreSQL provider's protected backup/snapshot tools or a secured `pg_dump` through the direct connection. Full backups contain all users and must remain restricted to the deployment owner. Preserve a current backup and coordinate downtime before any restore. Never expose a database backup through a public app route.

User CSV exports contain only that user's filtered transactions, not a full backup. For local PGlite development, stop the app and database server before copying `.data/postgres/`. Keep the preserved legacy SQLite file separately. No automatic restore/overwrite/reset operation is included.

## Verification completed for this change

- PostgreSQL migration applied successfully to a new, separate local development database.
- ESLint, strict TypeScript, 38 unit/database/ownership tests, and all 6 Edge browser workflows passed.
- Production Webpack build passed. Production smoke verification confirmed all eight financial pages redirect unauthenticated visitors to sign-in, `/login` and `/signup` return 200, and unauthenticated writes/CSV export return 401. Next.js may send a streamed redirect (HTTP 200 plus its redirect meta tag) after a loading boundary starts; the protected page still requires a valid session before reading financial records.
- New development database confirmed empty: zero users, sessions, accounts, transactions, holdings, deposits, friends, splits, settlements, and categories. Test data existed only in disposable in-memory databases. Default categories are created on registration.
- Dependency audit reported zero vulnerabilities. Hosted Vercel/PostgreSQL verification remains pending the deployment owner's environment configuration.
