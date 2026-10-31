# Order management flows (Mermaid)

Companion to [README.md](./README.md). Each section matches a `.mmd` file.

## 1. System architecture

```mermaid
flowchart TD
  A[E-Shop Next.js app] --> B[Customer portal]
  A --> C[Vendor portal]
  A --> D[Admin / Super portal]
  B --> E[Server actions + services]
  C --> E
  D --> E
  E --> F[Auth.js JWT + RBAC]
  E --> G[orders.ts / vendor-orders.ts]
  E --> H[payments adapter + settlement]
  E --> I[products / cart / inventory]
  E --> J[email outbox + order-notifications]
  F --> K[(Prisma DB)]
  G --> K
  H --> K
  I --> K
  J --> K
  H --> L[Paystack / bank transfer]
  J --> M[Resend or local outbox]
```

## 2. Customer checkout

```mermaid
flowchart TD
  A[Browse /shop] --> B[Product detail]
  B --> C[Add to cart]
  C --> D{Authenticated?}
  D -- No --> E[Login callbackUrl=/checkout]
  E --> F[Review cart]
  D -- Yes --> F
  F --> G[Server totals + stock]
  G --> H{In stock?}
  H -- No --> F
  H -- Yes --> I[placeOrderAction]
  I --> J[Payment]
  J --> K[Verified → PAID]
  K --> L[Track order]
```

## 3–10

See sibling `.mmd` files for vendor onboarding, admin management, payment verification, state machine, multi-vendor split, cancellation/refunds, role permissions, and failure recovery.
