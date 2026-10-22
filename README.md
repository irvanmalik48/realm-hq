# Realm HQ

The administrative command centre and management dashboard for the Realm platform. It provides a web interface to monitor services, observe real-time telemetry, moderate content, manage stored assets, issue API tokens, and configure administrator security. Built with Next.js, React, and Tailwind CSS, connecting directly to `realm-api` over high-performance gRPC and HTTPS REST.

---

## Features

- 3D Visitor Globe & Analytics: Interactive WebGL visitor globe powered by `cobe` with 16k dot density, dynamic lightness indicators, responsive country beacons, site filtering, and 24h page view telemetry.
- Direct Client File Storage: Dual storage backend (local Zstandard-compressed disk and AWS S3), direct client-to-backend binary uploads bypassing serverless payload limits (up to 50 MB), Blurhash image previews, and presigned download URLs.
- Post Management & Editor: Full article management with live preview, word count, estimated reading time, tag organization, and instant on-demand ISR revalidation.
- Comments & Reactions Moderation: Review user comments, pin key discussions, revise content, remove spam, and monitor emoji reaction counters.
- Pastes Moderation: Inspect, search, and manage code snippets and text pastes created across the platform.
- Two-Factor Authentication (2FA): Native RFC 6238 TOTP authentication with QR code scanner setup, verification challenges, and 8 emergency backup recovery codes.
- Real-Time Hardware Telemetry: Live gauges and historical charts tracking CPU utilization, core clock frequencies, memory usage, and database connection pool health.
- API Token Management: Generate programmatic access tokens with fine-grained permission scopes, inspect active tokens, and revoke credentials instantly.
- Administrator Accounts: Role-based access control, administrator invitations, and individual permission assignment.
- Structured Log Inspector: Search and filter live application logs by severity level and distributed trace ID.
- Dark & Light Modes: Tailored dark and light themes with responsive layouts designed for mobile and desktop screens.

---

## Requirements

- Node.js 20 or later
- pnpm 10 or later
- A running instance of `realm-api` with gRPC enabled (port `50051`) and HTTP REST gateway (port `8080`)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/irvanmalik48/realm-hq.git
cd realm-hq
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Copy the example environment file and fill in your settings:

```bash
cp .env.example .env.local
```

Key settings to review:

- `GRPC_API_URL`: Address of the backend gRPC server (for example, `127.0.0.1:50051`).
- `API_TOKEN`: An administrative API token created via `cmd/token` in `realm-api`.
- `NEXT_PUBLIC_API_URL`: HTTP REST address of `realm-api` for direct file uploads, avatar assets, and browser requests (for example, `http://localhost:8080`).

### 4. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) |
| `NEXT_PUBLIC_SITE_NAME` | Title shown in the browser tab and application header |
| `NEXT_PUBLIC_APP_URL` | Canonical web address of the dashboard (for example, `https://hq.irvanma.eu.org`) |
| `NEXT_PUBLIC_API_URL` | Public HTTPS REST backend URL for client-side uploads and queries |
| `NEXT_PUBLIC_BLOG_URL` | Web address of the main blog site for revalidation |
| `GRPC_API_URL` | Internal gRPC address of `realm-api` (for example, `api.irvanma.eu.org:443`) |
| `API_TOKEN` | Administrative API token used to authenticate gRPC requests |
| `SUPERADMIN_EMAILS` | Comma-separated list of emails granted initial superadmin access |
| `REVALIDATION_SECRET` | Shared secret between HQ and blog for cache purges |

---

## Available Scripts

```bash
# Start local development server
pnpm dev

# Build production bundle
pnpm build

# Run production server
pnpm start

# Run Biome formatting and linting checks
pnpm lint

# Run Oxlint static analysis
pnpm lint:oxlint

# Detect unused files and dependencies with Knip
pnpm run knip

# Run React Doctor health and performance audit
pnpm doctor

# Check TypeScript types
pnpm exec tsc --noEmit
```

---

## License

Licensed under the [Realm Collectives Community License (RCCL) Version 1.0](https://github.com/irvanmalik48/realm-hq/blob/main/LICENSE).