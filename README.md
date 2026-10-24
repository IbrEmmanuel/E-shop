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

## Production checklist

1. Set `DATABASE_URL` to PostgreSQL and switch `prisma/schema.prisma` provider if needed.
2. Set `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`, `AUTH_URL`.
3. Configure `PAYMENT_*` + webhook for live Paystack.
4. Set `EMAIL_API_KEY` (Resend) and `EMAIL_FROM`.
5. Optionally set `STORAGE_*` for S3/R2 image uploads.
6. Run `npm run db:push` (or migrations) **without** seeding production with local passwords.
7. `npm run build && npm run start` (or deploy to Vercel).

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
