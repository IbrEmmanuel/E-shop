# E-Shop — Multi-Vendor Marketplace

Full-stack Next.js marketplace: customer shopping, vendor rentals (pay monthly), bulk CSV/XLSX imports, advertising analytics, admin operations, and SEO for products & journal posts.

## Stack

- **Next.js** (App Router) + React + TypeScript
- **Tailwind CSS v4** + design tokens (light/dark)
- **Prisma** + SQLite locally / PostgreSQL in production
- **Auth.js** (credentials, JWT)
- **Paystack** payments · **Resend** email · **S3-compatible** uploads

## Features

| Area | Included |
|------|----------|
| Storefront | Home, shop, categories, products, search, vendors, cart, checkout |
| Sellers | Monthly rental plans, apply flow, products, XLSX/CSV batches, orders, wallet |
| Ads | Campaigns, sponsored placements, CTR/CPC/CPA/ROAS from real events |
| Admin | Platform metrics, products, categories, customers, imports, journal, audit, settings |
| Orders | Multi-vendor checkout, payment verify, fulfilment state machine, refunds, wallets — see [docs/order-management](./docs/order-management/README.md) |
| SEO | Metadata, JSON-LD, sitemap, robots |

## Local setup

```bash
cp .env.example .env
# Set AUTH_SECRET (openssl rand -base64 32)

npm install
npm run db:setup    # schema + catalog bootstrap
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Bootstrap accounts use `SEED_*` / `OWNER_*` from `.env` (defaults are for local only — rotate before any shared deploy).

## Deploy on Vercel (required)

SQLite does **not** work on Vercel. Use Postgres:

1. Create a free DB on [Neon](https://neon.tech) or Vercel → Storage → Postgres.
2. In the Vercel project → **Settings → Environment Variables**, set:
   - `DATABASE_URL` — Postgres connection string (`postgresql://…`)
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_URL` — `https://your-app.vercel.app`
   - `NEXT_PUBLIC_SITE_URL` — same as `AUTH_URL`
3. Redeploy.
4. From your machine (with the same `DATABASE_URL` in `.env`):
   ```bash
   npx prisma db push
   npm run db:seed
   ```
   (Skip seed on a real production store if you do not want demo admin users.)

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run db:push
npm run db:seed      # local/staging catalog only
npm run db:setup
```

## License

Private — all rights reserved.
