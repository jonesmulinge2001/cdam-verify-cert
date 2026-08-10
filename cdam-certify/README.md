# CDAM Certify

> Certificate issuance and public verification platform for CDAM, Chuka University — covering short courses, internships, and attachments.


## 📋 Overview

CDAM Certify is a complete certificate management system that streamlines the entire lifecycle from student application to certificate verification. It bridges Google Forms data with a secure, auditable certification process featuring digitally signed QR codes for instant verification.

## 🏗️ Architecture


┌─────────────────────────────────────────────────────────────────────────────┐
│                               DATA FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Google Form          Google Sheet            CSV Import           Postgres
       │                    │                       │                  │
       └────────────────────┴───────────────────────┘                  │
                                                                        │
                                        Admin marks COMPLETED          │
                                        (status gate)                  │
                                                                        │
                                        Admin issues certificate       │
                                        (bulk or single)              │
                                                                        │
                                        BullMQ generates PDF           │
                                        (Puppeteer) + signed QR        │
                                                                        │
                                        Upload to Cloudinary            │
                                        Email via Resend               │
                                                                        │
                                        Public verify page             │
                                        checks signature + status      │

> **Note:** Applications and certification are deliberately separate. Importing a student from the Sheet only creates an `APPLIED` enrollment. Nothing is verifiable until an admin explicitly marks it `COMPLETED` and issues a certificate.


## 🛠️ Stack

### Backend
- **Framework:** NestJS
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Queue:** BullMQ + Redis
- **PDF Generation:** Puppeteer
- **Storage:** Cloudinary
- **Email:** Resend

### Frontend
- **Framework:** Angular 18 (standalone, signals)
- **Styling:** Tailwind CSS
- **Icons:** Material Icons

### Authentication
- JWT with role-based access (`SUPER_ADMIN`, `ADMIN`, `VIEWER`)

## 🚀 Getting Started

### 1. Infrastructure Setup

Start PostgreSQL and Redis containers:

docker compose up -d


### 2. Backend Setup

cd backend
cp .env.example .env   # Fill in DB, JWT, Cloudinary, Resend, QR secrets
npm install
npm run prisma:migrate
npx ts-node prisma/create-admin.ts you@cdam.chuka.ac.ke "a-strong-password" "Your Name"
npm run start:dev


The API runs on `http://localhost:3000/api`.

### 3. Certificate Template

> **Prerequisite:** Certificates can't be issued until an active `CertificateTemplate` exists per `ProgramType`.

Insert a template using:

- **Option A:** Prisma Studio

  npx prisma studio

- **Option B:** Use the default template at `prisma/templates/default-certificate.html`

### 4. Frontend Setup


cd frontend
npm install
npm start


The application runs on `http://localhost:4200`.

- **Public Verification:** `/verify`
- **Admin Console:** `/admin` (requires login)


## 📁 Project Structure

### Backend (`backend/`)


backend/
├── prisma/
│   ├── schema.prisma              # Full data model
│   ├── seed.ts                    # One-off CLI import from CSV
│   └── create-admin.ts            # Bootstrap first SUPER_ADMIN
├── src/
│   ├── auth/                      # JWT login, strategy, guards
│   ├── programs/                  # Program CRUD
│   ├── students/                  # Student CRUD, search, pagination
│   ├── student-programs/          # APPLIED → COMPLETED pipeline
│   ├── import/                    # CSV upload endpoint (Google Sheets export)
│   ├── certificates/              # Generation, QR signing, PDF render, revoke
│   ├── verify/                    # Public, rate-limited verification
│   └── mail/                      # Resend email delivery
```

### Frontend (`frontend/`)


frontend/
└── src/
    ├── app/
    │   ├── core/                  # Auth, guards, interceptors, API services
    │   ├── shared/
    │   │   └── components/        # Toast, badge, empty-state, skeleton
    │   ├── features/
    │   │   ├── public/
    │   │   │   └── verify/        # Public verification page
    │   │   ├── auth/
    │   │   │   └── login/         # Admin login
    │   │   └── admin/             # Dashboard, programs, students, certificates



## 🔒 Security Notes

### QR Code Security
- QR codes encode a **certificate ID** and an **HMAC signature** (`QR_SIGNING_SECRET`)
- The verify endpoint rejects a certId without a matching signature
- A guessed or enumerated ID alone cannot be confirmed as legitimate
- Only a scanned QR (or manually copied full verify URL) resolves cleanly

### Rate Limiting
- Public verify endpoint: 20 requests/minute/IP
- Slows down enumeration attempts

### PDF Generation
- Generated server-side from a trusted template
- Never accept template HTML from an unauthenticated source

### Production Readiness
- Rotate `JWT_SECRET` and `QR_SIGNING_SECRET` before production
- Never commit `.env` files

## 📋 Upcoming Features

- [ ] Certificate template management UI (currently seeded directly in database)
- [ ] Bounce-handling webhook from Resend to auto-flag failed deliveries
- [ ] CSV import diff-preview before commit (currently imports immediately)


## 👥 Roles & Permissions

| Role | Permissions |
|------|-------------|
| **SUPER_ADMIN** | Full system access, user management |
| **ADMIN** | Issue certificates, manage students, view all |
| **VIEWER** | Read-only access to all data |
