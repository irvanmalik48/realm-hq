# Deploying Realm HQ to Vercel (`hq.irvanma.eu.org`)

This guide provides step-by-step instructions for deploying **Realm HQ** (Administrative Command Centre) to Vercel at `https://hq.irvanma.eu.org`, connected to the production backend at `https://api.irvanma.eu.org`.

---

## 1. Environment Variables for Vercel

In your **Vercel Project Settings** &rarr; **Environment Variables**, configure the following variables for **Production**, **Preview**, and **Development**:

| Variable Name | Production Value | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_NAME` | `Realm HQ` | Title displayed in browser tab and headers |
| `NEXT_PUBLIC_APP_URL` | `https://hq.irvanma.eu.org` | Canonical URL of Realm HQ |
| `NEXT_PUBLIC_API_URL` | `https://api.irvanma.eu.org` | Public HTTPS REST backend URL |
| `NEXT_PUBLIC_BLOG_URL` | `https://irvanma.eu.org` | Main public blog site (`realm-reference`) |
| `GRPC_API_URL` | `api.irvanma.eu.org:443` | Secure gRPC endpoint (SSL/TLS enabled) |
| `API_TOKEN` | `realm_tok_...` | Admin service token generated via `realm-api` |
| `SUPERADMIN_EMAILS` | `admin@example.com` | Comma-separated superadmin emails |
| `REVALIDATION_SECRET` | *(random 32-byte hex)* | Shared secret between HQ and blog for instant cache purges |
| `NODE_ENV` | `production` | Node production mode |

> [!NOTE]
> `NEXT_PUBLIC_API_URL` is used by client-side hooks, post management, and serverless proxy routes.
> If Cloudflare proxies `api.irvanma.eu.org` with gRPC disabled, HQ automatically uses high-performance HTTPS REST endpoints for authentication and post management.

---

## 2. Domain & DNS Configuration

To bind `hq.irvanma.eu.org` to your Vercel project:

1. **Add Custom Domain in Vercel**:
   - Go to **Project Settings** &rarr; **Domains**.
   - Enter: `hq.irvanma.eu.org`
   - Click **Add**.

2. **Configure DNS Records** (in Cloudflare or your DNS registrar):
   - **Type**: `CNAME`
   - **Name**: `hq` (or `hq.irvanma.eu.org`)
   - **Target**: `cname.vercel-dns.com`
   - **Proxy status**: If using Cloudflare, set to **DNS Only** (grey cloud) during initial SSL certificate issuance, or **Proxied** (orange cloud) with SSL mode set to **Full (Strict)**.

3. **Verify SSL Certificate**:
   - Vercel will automatically provision a Let's Encrypt Wildcard / SNI SSL certificate.

---

## 3. Backend API CORS Update

Your backend (`realm-api`) must allow requests originating from `https://hq.irvanma.eu.org`.

In your production backend's `.env` (or Docker/Systemd environment):
```bash
ALLOWED_ORIGINS=https://irvanma.eu.org,https://hq.irvanma.eu.org,http://localhost:3000,http://localhost:3001
```

Restart the `realm-api` server so the CORS middleware accepts requests from HQ.

---

## 4. Two-Factor Authentication (2FA)

Realm HQ includes native **RFC 6238 TOTP Two-Factor Authentication**:

1. **Activating 2FA on your Admin Account**:
   - Log into Realm HQ with your credentials.
   - Click the **Shield / 2FA** button in the sidebar footer (or in **Administrators** toolbar).
   - Scan the QR code using Google Authenticator, 1Password, Bitwarden, or Apple Passwords (or manually enter the Base32 secret key).
   - Enter the 6-digit confirmation code and click **Verify & Enable 2FA**.
   - **Important**: Save the **8 emergency backup recovery codes** displayed. Each recovery code can be used once if you lose your phone or authenticator app.

2. **Signing In with 2FA**:
   - Enter your email/username and password on `/login`.
   - The login card smoothly transitions to the 2FA challenge screen.
   - Enter your 6-digit passcode (or click *"Use emergency recovery code instead"*).
   - Once verified, a 7-day PASETO session token is issued and stored in an HTTP-only secure cookie.

---

## 5. Seeding Past Posts to Production

If your production database at `api.irvanma.eu.org` is empty, run the automated seeder script:

```bash
cd /path/to/realm-api
python3 scripts/seed_prod_posts.py --url https://api.irvanma.eu.org --token <YOUR_ADMIN_API_TOKEN>
```

The script will:
1. Parse all `.md` and `.mdx` files from `realm-reference/posts`.
2. Extract frontmatter (title, description, tags, createdAt, updatedAt) and markdown content.
3. Compute word count and reading time.
4. Upload each article to `https://api.irvanma.eu.org/v1/posts` via REST with upsert support.

To verify production posts:
```bash
curl -s https://api.irvanma.eu.org/v1/posts | jq
```

---

## 6. Pre-Flight Verification Checklist

Before announcing the deployment:
- [ ] Vercel build succeeds without errors (`pnpm run build`).
- [ ] TypeScript check passes with zero diagnostics (`pnpm exec tsc --noEmit`).
- [ ] Biome linter check passes (`pnpm run lint`).
- [ ] Visit `https://hq.irvanma.eu.org/login` and verify page loads with HTTPS.
- [ ] Log in with your admin credentials.
- [ ] Verify 2FA prompt appears (if 2FA is active on the account).
- [ ] Check **Posts** dashboard: Ensure all articles load from `https://api.irvanma.eu.org`.
- [ ] Check **Comments Moderation**: Confirm real database comments are loaded.
- [ ] Check **Analytics**: Verify live 24h page view graph displays real data.
