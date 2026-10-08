# Realm HQ

The administrative dashboard and management panel for the Realm platform. It provides a web interface to monitor services, moderate content, manage stored files, issue API tokens, and configure administrator accounts. Built with Next.js, React, and Tailwind CSS, and connects directly to `realm-api` over gRPC.

---

## Features

- Overview Dashboard: View overall platform health, recent activity, and system status at a glance.
- Realtime Telemetry: Live tracking of CPU load, CPU clock frequencies, memory usage, and database connection pool status with historical charts.
- Messages Inbox: View, search, and delete messages sent from the public contact form.
- Comments and Reactions: Review user comments, pin or edit entries, and monitor post reaction counters.
- File Storage: Browse stored assets, upload new files, and delete existing media.
- API Token Management: Generate programmatic access tokens with custom scopes, inspect token details, and revoke tokens instantly.
- Administrator Accounts: Invite administrators and adjust individual permissions.
- System Logs: Search and inspect structured application logs by severity and trace ID.
- Dark and Light Themes: Built-in theme toggle with responsive layout for mobile and desktop screens.

---

## Requirements

- Node.js 20 or later
- pnpm 10 or later
- A running instance of `realm-api` with gRPC enabled (port `50051`)

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
- `NEXT_PUBLIC_API_URL`: HTTP address of `realm-api` for public media and file downloads (for example, `http://localhost:8080`).

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
| `NEXT_PUBLIC_SITE_NAME` | Name shown in the page header and browser tab |
| `NEXT_PUBLIC_APP_URL` | Web address of the dashboard (for example, `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Public HTTP URL of `realm-api` (for example, `http://localhost:8080`) |
| `GRPC_API_URL` | Internal gRPC address of `realm-api` (for example, `127.0.0.1:50051`) |
| `API_TOKEN` | Administrative API token used to authenticate gRPC requests |
| `SUPERADMIN_EMAILS` | Comma-separated list of emails granted initial superadmin access |

---

## Available Scripts

```bash
# Start local development server
pnpm dev

# Build production bundle
pnpm build

# Run production server
pnpm start

# Run linter and formatting checks
pnpm lint

# Run React health audit
pnpm doctor

# Check TypeScript types
pnpm exec tsc --noEmit
```

---

## License

Licensed under the [Realm Collectives Community License (RCCL) Version 1.0](https://github.com/irvanmalik48/realm-hq/blob/main/LICENSE).