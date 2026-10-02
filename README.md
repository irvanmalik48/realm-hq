# Realm HQ

The unified command centre and administrative console for the **Realm** ecosystem, built with **Next.js 16**, **React 19**, **Base UI**, **Tailwind CSS v4**, and native **React View Transitions**, communicating directly with `realm-api` via pure **gRPC**.

---

## Features

- **Framework & Engine**: [Next.js 16](https://nextjs.org/) with Turbopack, [React 19](https://react.dev/), `cacheComponents`, and `partialPrefetching`.
- **Base UI & Vega Design System**: High-performance accessible UI primitives built on `@base-ui/react`, [Tailwind CSS v4](https://tailwindcss.com/), seamless dark/light theme switching, and responsive collapsible sidebar navigation.
- **Native React View Transitions**: Fluid page navigation and directional spatial animations powered by native browser View Transitions and `<DirectionalTransition>`.
- **Pure gRPC Client Architecture**: Dynamic protobuf loader (`@grpc/grpc-js` and `@grpc/proto-loader`) connecting directly to backend microservices over HTTP/2 with robust error mapping.
- **Authentication & Granular RBAC**:
  - Unified with `realm` portfolio via encrypted **PASETO v2** authentication cookies (`realm_auth_token`).
  - Next.js 16 `proxy.ts` perimeter protection guarding all dashboard routes with automatic redirects to `/login`.
  - Atomic RBAC matrix: environment-based superadmin bootstrap with granular admin capability controls (`can_manage_admins`, `can_manage_tokens`, `can_manage_storage`, `can_moderate_comments`, `can_delete_messages`, `can_manage_reactions`, `can_purge_logs`, `can_view_telemetry`).
- **Command Centre Modules**:
  - **Overview Dashboard (`/`)**: High-level platform KPIs, interactive Go runtime heap charts with [Recharts](https://recharts.org/), and real-time system log feed.
  - **Contact Submissions (`/messages`)**: Inbox management with [TanStack Table](https://tanstack.com/table), global search filtering, and slide-over message detail inspector.
  - **Comments Moderation (`/comments`)**: Thread moderation ledger with inline pinning, content editing modal, and single-click deletion.
  - **Reactions & Breakdown (`/reactions`)**: Reaction counts across posts with emoji badges and individual reaction counter resets.
  - **Dual-Engine Storage & S3 (`/storage`)**: Unified object manager supporting local Zstandard-compressed files and AWS S3 / Cloudflare R2 buckets with presigned URL generation and direct file uploads.
  - **API Token Management (`/tokens`)**: Cryptographic API token generator (`realm_tok_...`) with granular permission scopes, expiration timestamps, one-time reveal banners, and instant revocation.
  - **Admin Roster & Roles (`/admins`)**: Access governance console allowing superadmins to invite administrators and toggle atomic capabilities.
  - **System Telemetry (`/telemetry`)**: Real-time Go runtime statistics (goroutines, heap allocation, GC pause cycles, CPU usage) and PostgreSQL connection pool monitors (idle, acquired, max connections).
  - **Structured System Logs (`/logs`)**: Centralized `slog` viewer with severity badges, trace ID correlation filters, structured JSON payload inspector, and retention purge triggers.
- **PWA & Official Branding**:
  - Standalone PWA installation support via `site.webmanifest` and high-resolution icons.
  - Synchronized official favicon suite and OpenGraph/Twitter social cards.
- **Security & Type-Safety**:
  - Strict runtime environment validation using `@t3-oss/env-nextjs` and `zod`.
  - Zero exposed secrets in client bundles with dedicated Server-side BFF proxy route handlers.
  - Perfect **100 / 100** codebase health score audited with [React Doctor](https://react.doctor/).

---

## Project Structure

```
realm-hq/
├── public/                     # Favicons, PWA icons, site.webmanifest
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admins/             # Admin roster & RBAC permissions page
│   │   ├── api/                # BFF API route handlers (auth, admins, logs, etc.)
│   │   ├── comments/           # Comment moderation page
│   │   ├── login/              # Command centre authentication page
│   │   ├── logs/               # Structured system logs viewer page
│   │   ├── messages/           # Contact submissions page
│   │   ├── reactions/          # Post reactions ledger page
│   │   ├── storage/            # Dual-engine S3/local storage explorer
│   │   ├── telemetry/          # Go runtime & DB pool telemetrics page
│   │   ├── tokens/             # API tokens generator & revocation page
│   │   ├── globals.css         # Theme tokens and root stylesheet
│   │   ├── layout.tsx          # Root layout with providers & metadataBase
│   │   └── page.tsx            # Overview dashboard with live KPIs & charts
│   ├── components/             # Reusable UI & layout components
│   │   ├── layout/             # AppHeader, AppSidebar, DashboardShell
│   │   ├── ui/                 # Base UI shadcn components (table, dialog, etc.)
│   │   ├── directional-transition.tsx # Spatial View Transitions wrapper
│   │   └── theme-provider.tsx  # Next-themes dark/light mode provider
│   ├── hooks/                  # Custom React hooks (useMobile, etc.)
│   ├── lib/                    # Auth context, gRPC clients, and error mappers
│   ├── proto/                  # Protobuf service contracts (synced with realm-api)
│   ├── env.ts                  # Type-safe environment validation schema
│   └── proxy.ts                # Next.js 16 route security proxy
├── .github/
│   └── workflows/              # GitHub Actions CI & React Doctor workflows
├── .env.example                # Environment variables template
├── doctor.config.json          # React Doctor configuration
├── next.config.ts              # Next.js configuration (Cache Components, Turbopack)
├── package.json                # Project dependencies and scripts
├── pnpm-workspace.yaml         # Build scripts approval & package rules
├── tsconfig.json               # TypeScript configuration
└── vercel.json                 # Vercel deployment & region configuration
```

---

## Getting Started

### Prerequisites
- Node.js `20.x` or later (or Bun / pnpm)
- [pnpm](https://pnpm.io/) `10.x` or later recommended
- Running [realm-api](https://github.com/irvanmalik48/realm-api) instance with gRPC server enabled (`:50051`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/irvanmalik48/realm-hq.git
cd realm-hq
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NODE_ENV` | Environment (`development`, `production`, `test`) |
| `NEXT_PUBLIC_SITE_NAME` | Display name in header and tabs (default: `Realm HQ`) |
| `NEXT_PUBLIC_APP_URL` | Canonical application URL (e.g. `https://hq.irvanma.eu.org` or `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | HTTP API base URL of `realm-api` (e.g. `http://localhost:8080`) |
| `GRPC_API_URL` | gRPC backend endpoint of `realm-api` (e.g. `127.0.0.1:50051`) |
| `API_TOKEN` | System-level API token (`realm_tok_...`) for gRPC calls |
| `SUPERADMIN_EMAILS` | Comma-separated email list initialized as superadmins |

### 3. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality Verification & Scripts

```bash
# 1. Type-check TypeScript codebase
pnpm exec tsc --noEmit

# 2. Run Biome checks & formatting
pnpm lint
pnpm format

# 3. Codebase health audit (React Doctor)
pnpm doctor

# 4. Build optimized production bundle
pnpm build

# 5. Start production server
pnpm start
```

---

## Contributing

Please review the [Contribution Notice](https://irvanma.eu.org/contribution) before submitting pull requests. All commits must follow Conventional Commits formatting, include a Developer Certificate of Origin sign-off (`git commit -s`), and be cryptographically verified (`git commit -S`).

---

## License

Licensed under the [Realm Collectives Community License (RCCL) Version 1.0](https://github.com/irvanmalik48/realm-hq/blob/main/LICENSE).