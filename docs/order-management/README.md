# Order management — architecture & flows

This folder documents the **implemented** Customer, Vendor, and Admin order lifecycle for E-Shop. Diagrams mirror code in `src/services/orders.ts`, `src/services/vendor-orders.ts`, `src/lib/order-lifecycle.ts`, `src/lib/payments/*`, and `src/services/wallet.ts`.

## How to view Mermaid diagrams

- GitHub / GitLab render `.md` fenced `mermaid` blocks automatically.
- VS Code / Cursor: Mermaid preview extension.
- [mermaid.live](https://mermaid.live) — paste contents of any `.mmd` file.

## Existing stack (do not replace)

| Layer | Choice |
| --- | --- |
| App | Next.js App Router + server actions |
| Auth | Auth.js (JWT credentials) + roles `CUSTOMER` \| `VENDOR` \| `ADMIN` \| `SUPER_ADMIN` |
| ORM / DB | Prisma · SQLite local · PostgreSQL on Vercel |
| Payments | Paystack adapter + bank/fintech transfer reconciliation |
| Commission | Per-vendor `commissionBps` (default **1000 = 10%** on vendor item gross) |

## Order lifecycle (short)

1. Authenticated checkout creates `Order` + per-vendor `VendorOrder` rows, reserves stock, unique `idempotencyKey`.
2. Payment row starts `PENDING` / `REQUIRES_ACTION` (bank proof) or Paystack initialize.
3. Order becomes `PAID` only after provider verify **or** admin bank confirmation (amount/currency/ref checks).
4. Vendors advance `PAID → ACCEPTED → PACKAGED → SHIPPED → DELIVERED` (ownership enforced).
5. Parent order rolls up; wallet settlement + commission snapshot on full delivery.
6. Unpaid cancel / expire releases reservations; admin refund restores inventory + clawback ledger.

## Portals (actual routes)

| Role | Routes |
| --- | --- |
| Customer | `/shop`, `/cart`, `/checkout`, `/account/orders`, `/account/orders/[orderNumber]` |
| Vendor | `/vendor`, `/vendor/products`, `/vendor/orders`, `/vendor/earnings`, `/vendor/payouts`, `/vendor/apply` |
| Admin | `/admin`, `/admin/orders`, `/admin/orders/[orderNumber]`, `/admin/payments`, `/admin/vendors`, … |
| Super | `/super`, `/super/admins`, `/super/audit` |

## Environment

See root `.env.example`. Critical:

- `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` / `NEXT_PUBLIC_SITE_URL`
- `PAYMENT_SECRET_KEY` + `PAYMENT_WEBHOOK_SECRET` (Paystack)
- Settlement account vars for bank-transfer mode
- `EMAIL_API_KEY` optional (otherwise console/outbox)

## Diagram index

1. [system-architecture.mmd](./system-architecture.mmd)
2. [customer-checkout.mmd](./customer-checkout.mmd)
3. [vendor-onboarding-and-orders.mmd](./vendor-onboarding-and-orders.mmd)
4. [admin-order-management.mmd](./admin-order-management.mmd)
5. [payment-verification.mmd](./payment-verification.mmd)
6. [order-status-state-machine.mmd](./order-status-state-machine.mmd)
7. [multi-vendor-order-splitting.mmd](./multi-vendor-order-splitting.mmd)
8. [cancellation-refund-and-returns.mmd](./cancellation-refund-and-returns.mmd)
9. [role-permissions.mmd](./role-permissions.mmd)
10. [failure-recovery-and-notifications.mmd](./failure-recovery-and-notifications.mmd)

Readable copies with the same graphs: [flows.md](./flows.md).

## Known limitations

- No separate physical-return / dispute workflow UI yet (`REFUNDED` is admin-driven; bank refunds are offline).
- Fine-grained staff roles (Finance / Support) beyond `ADMIN` / `SUPER_ADMIN` are not separate role enums.
- Guest browse + cart allowed; **checkout requires sign-in**.
- Vendor catalogue import/settings live under admin vendor tools; no dedicated `/vendor/inventory` or `/vendor/settings` pages yet.
- Shipping fee is on the parent order (not split per vendor).
- Default platform commission is **10%** (`commissionBps` 1000), not 12%.
