# CDAM Certify

Certificate issuance and public verification platform for CDAM, Chuka University — covering short courses, internships, and attachments.

## Architecture

```
Google Form → Google Sheet → CSV import → Postgres
                                              │
                          Admin marks COMPLETED (status gate)
                                              │
                          Admin issues certificate (bulk or single)
                                              │
                    BullMQ: generate PDF (Puppeteer) + signed QR
                                              │
                          Upload to Cloudinary → email via Resend
                                              │
                    Public verify page checks signature + status
```

Applications and certification are deliberately separate: importing a student from the Sheet only creates an `APPLIED` enrollment. Nothing is verifiable until an admin explicitly marks it `COMPLETED` and issues a certificate.

## Stack

- **Backend**: NestJS, Prisma, PostgreSQL, BullMQ + Redis, Puppeteer, Cloudinary, Resend
- **Frontend**: Angular 18 (standalone, signals), Tailwind CSS, Material Icons
- **Auth**: JWT with role-based access (`SUPER_ADMIN`, `ADMIN`, `VIEWER`)

## Getting started

### 1. Infrastructure

```bash
docker compose up -d
```

Starts Postgres and Redis locally.

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in DB, JWT, Cloudinary, Resend, QR secrets
npm install
npm run prisma:migrate
npx ts-node prisma/create-admin.ts you@cdam.chuka.ac.ke "a-strong-password" "Your Name"
npm run start:dev
```

API runs on `http://localhost:3000/api`.

### 3. Configure email delivery

Certificates and award letters are sent through [Resend](https://resend.com). Without this configured, issuance still succeeds and the PDF still uploads to Cloudinary — only the email send fails, and the certificate is marked with an error rather than a bounce (see "Mail configuration" below for the distinction).

1. Create a Resend account and verify your sending domain (`cdam.chuka.ac.ke` or a subdomain of it) — this is required before Resend will deliver to real inboxes, especially internationally.
2. Add the SPF/DKIM DNS records Resend gives you.
3. In `backend/.env`, set:
   ```
   RESEND_API_KEY="re_xxxxxxxxxxxx"
   MAIL_FROM="CDAM Chuka University <certificates@cdam.chuka.ac.ke>"
   ```
4. Restart the backend. Mail sending is checked lazily — if either variable is missing, issuance still works, but `POST /certificates/:id/resend` (and the automatic post-issuance send) returns a clear "email sending is not configured" error instead of a generic failure.

### 4. Seed the internship domain award letters

Six domains ship as ready-to-use templates: Machine Learning, Data Science, Software Development, Web Development, Backend Development, Frontend Development. Each gets its own `Program` (type `INTERNSHIP`) and its own `CertificateTemplate` row with domain-specific wording.

```bash
cd backend
npm run prisma:seed-templates
```

Safe to re-run — it matches existing programs by name and updates the template in place rather than duplicating rows. After seeding, go to **Programs** in the admin UI and set the real start/end dates for each domain (they default to a 90-day placeholder window, same as domains auto-created by the CSV importer).

If your multi-domain sheet import (see step below) creates a domain program *before* this seed script runs, that's fine — the seed script matches by name and reuses the existing program rather than creating a duplicate.

### 5. Seed a certificate template for non-internship programs

Short courses and attachments still need a **type-level** default template (`programId: null`) since they don't go through the six-domain seed above. Insert one using `prisma/templates/default-certificate.html` as the `htmlContent`, either via Prisma Studio (`npx prisma studio`) or a short script.

### 6. Frontend

```bash
cd frontend
npm install
npm start
```

Runs on `http://localhost:4200`. Public verification lives at `/verify`; the admin console is at `/admin` (requires login).

## Project layout

```
backend/
  prisma/schema.prisma        — full data model
  prisma/seed.ts               — one-off CLI import from a CSV export
  prisma/create-admin.ts       — bootstrap the first SUPER_ADMIN
  src/auth/                    — JWT login, strategy, guards
  src/programs/                — program CRUD
  src/students/                — student CRUD, search, pagination
  src/student-programs/        — the APPLIED → COMPLETED status pipeline
  src/import/                  — CSV upload endpoint (Google Sheets export)
  src/certificates/            — generation, QR signing, PDF render, revoke, BullMQ processors
  src/verify/                  — public, rate-limited verification endpoint
  src/mail/                    — Resend email delivery

frontend/
  src/app/core/                — auth, guards, interceptors, typed API services, models
  src/app/shared/components/   — toast, badge, empty-state, skeleton
  src/app/features/public/verify/    — public verification page
  src/app/features/auth/login/       — admin login
  src/app/features/admin/            — dashboard, programs, students, certificates
```

## How certificate storage works (confirmed, not just intended)

When an admin clicks **Issue certificate**, `CertificatesService.generate()`:

1. Renders the domain-specific (or type-level default) HTML template to a PDF in memory via Puppeteer
2. Uploads that PDF buffer directly to Cloudinary
3. Stores **only** the returned `secure_url` in `Certificate.fileUrl` (a `String?` column)

The PDF bytes themselves are never written to Postgres — not as a blob, not as base64. The in-memory buffer is discarded once the Cloudinary upload resolves. The only other place a buffer briefly exists is inside `sendEmail()`, where the PDF is re-downloaded from the Cloudinary URL just long enough to attach it to the outgoing email, then discarded.

## Per-domain template resolution

`resolveTemplate()` in `CertificatesService` looks up a template in two steps: first by exact `programId` match (the domain-specific award letter), falling back to a `programType`-level default only if no domain-specific template exists. This was a real bug in the original version — the lookup only filtered by `programType`, which meant any active internship template could have been picked regardless of domain. Worth knowing if you ever add a seventh domain: it needs its own `CertificateTemplate` row with `programId` set, or it'll silently fall through to the type-level default (which doesn't exist unless you've seeded one per step 5 above).

## Security notes worth knowing before going live

- QR codes encode a certificate ID **and** an HMAC signature (`QR_SIGNING_SECRET`). The verify endpoint rejects a certId without a matching signature, so a guessed or enumerated ID alone cannot be confirmed as legitimate — only a scanned QR (or a manually copied full verify URL) resolves cleanly.
- The public verify endpoint is rate-limited (20 requests/minute/IP) to slow down enumeration attempts.
- Certificate PDFs are generated server-side from a trusted template — never accept template HTML from an unauthenticated source.
- Rotate `JWT_SECRET` and `QR_SIGNING_SECRET` before production, and never commit `.env`.

## Not yet built (next steps)

- Certificate template management UI (currently seeded directly in the database)
- Bounce-handling webhook from Resend to auto-flag failed deliveries in the certificates list
- CSV import diff-preview before commit (currently imports immediately)