# Project Architecture

Feature-based architecture for the Next.js App Router monorepo. Every domain lives in its own feature folder. Shared infrastructure lives outside features.

## When to use

When creating new features, pages, components, tRPC routers, DB tables, or any domain-specific code. Always follow this structure.

## Directory structure

```
apps/web/
├── app/                          # Next.js App Router — routing ONLY
│   ├── (marketing)/              #   Route groups for layouts
│   ├── (dashboard)/              #   e.g. /dashboard/settings
│   └── api/                      #   API routes (tRPC, webhooks)
│
├── features/                     # Feature modules — all domain logic here
│   └── [feature]/
│       ├── components/           #   Feature-specific React components
│       ├── views/                #   Full page compositions (imported by app/ pages)
│       ├── layouts/              #   Feature-specific layouts
│       ├── hooks/                #   Feature-specific React hooks
│       ├── store/                #   Zustand stores for this feature
│       ├── context/              #   React context providers
│       ├── utils/                #   Helpers, formatters, constants
│       └── server/               #   All backend logic for this feature
│           ├── router.ts         #     tRPC procedures (query, mutation)
│           ├── repository.ts     #     DB queries (Drizzle ORM)
│           ├── service.ts        #     Business logic, orchestration
│           ├── schemas.ts        #     Zod validation schemas (input/output DTOs)
│           ├── sms/              #     SMS notification classes (BaseSms subclasses)
│           ├── email/            #     Email template classes
│           ├── whatsapp/         #     WhatsApp message classes
│           └── jobs.ts           #     Trigger.dev task wrappers (enqueue helpers)
│
├── components/                   # Shared React components
│   ├── ui/                       #   shadcn primitives (DO NOT edit manually)
│   └── [shared]/                 #   Composed reusable components (Header, Footer, etc.)
│
├── hooks/                        # Shared React hooks
├── store/                        # Global Zustand stores (auth, theme, sidebar)
├── context/                      # Global React context providers
│
├── lib/                          # Shared libraries (framework-level)
│   ├── sms/                      #   SMS library (manager, transports, base class)
│   ├── cache/                    #   Cache library (manager, providers, store)
│   ├── email/                    #   Email library (when created)
│   └── utils.ts                  #   General utilities (cn, formatters)
│
├── db/                           # Database (centralized — migrations need single source)
│   ├── index.ts                  #   Drizzle client export
│   ├── schema/                   #   Table definitions (all tables here)
│   └── migrations/               #   Generated migration files
│
├── trpc/                         # tRPC infrastructure
│   ├── init.ts                   #   createTRPCRouter, base procedures, context
│   ├── middleware/                #   Shared middleware (auth, rate limit, logging)
│   ├── server.tsx                #   Server-side caller
│   ├── client.tsx                #   Client-side hooks (React Query)
│   ├── query-client.ts           #   React Query client config
│   └── routers/
│       └── _app.ts               #   Root router (merges all feature routers)
│
├── trigger/                      # Trigger.dev task definitions (when created)
│   └── tasks/                    #   Actual task files (send-sms, process-order, etc.)
│
└── env.ts                        # Environment variable validation
```

## Rules

### 1. `app/` is for routing ONLY

Pages in `app/` are thin shells that import views from `features/`. No business logic, no complex UI.

```tsx
// app/orders/page.tsx — thin shell
import { OrderListView } from "@/features/orders/views/order-list";

export default function OrdersPage() {
  return <OrderListView />;
}
```

```tsx
// app/orders/[id]/page.tsx
import { OrderDetailView } from "@/features/orders/views/order-detail";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <OrderDetailView params={params} />;
}
```

### 2. Features own their domain

Everything related to a domain lives inside its feature folder. A feature should be self-contained — you should be able to understand the entire domain by reading one folder.

```
features/orders/
├── components/
│   ├── order-card.tsx
│   ├── order-status-badge.tsx
│   └── order-timeline.tsx
├── views/
│   ├── order-list.tsx
│   └── order-detail.tsx
├── hooks/
│   └── use-order-filters.ts
├── store/
│   └── order-filters.ts          # Zustand store
├── utils/
│   └── format-order-number.ts
└── server/
    ├── router.ts                  # tRPC: orders.list, orders.getById, orders.create
    ├── repository.ts              # DB: findMany, findById, insert, update
    ├── service.ts                 # Business: calculateTotal, validateStock
    ├── schemas.ts                 # Zod: createOrderInput, orderOutput
    ├── sms/
    │   └── order-shipped-sms.ts   # extends BaseSms
    └── jobs.ts                    # Trigger.dev wrappers
```

### 3. tRPC procedures and middleware

`trpc/init.ts` defines the procedure hierarchy. `trpc/middleware/` contains reusable middleware. Feature routers import the procedure they need.

```ts
// trpc/middleware/auth.ts
import { TRPCError } from "@trpc/server";
import { t } from "@/trpc/init";

export const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});
```

```ts
// trpc/middleware/rate-limit.ts
import { TRPCError } from "@trpc/server";
import { t } from "@/trpc/init";

export const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  // Check rate limit (e.g., via cache or upstash ratelimit)
  const allowed = await checkRateLimit(ctx.ip);
  if (!allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
  return next();
});
```

```ts
// trpc/init.ts — procedure hierarchy
export const baseProcedure = t.procedure;                         // Public, no auth
export const authedProcedure = t.procedure.use(authMiddleware);   // Requires session
export const adminProcedure = authedProcedure.use(adminMiddleware); // Requires admin role
export const rateLimitedProcedure = t.procedure.use(rateLimitMiddleware);
```

### 4. Feature server/ routers plug into the root

Each feature defines its own tRPC router. The root router in `trpc/routers/_app.ts` merges them. Features import the procedure level they need — most will use `authedProcedure`:

```ts
// features/orders/server/router.ts
import { authedProcedure, createTRPCRouter } from "@/trpc/init";
import { z } from "zod";
import * as repo from "./repository";
import { createOrderInput } from "./schemas";

export const ordersRouter = createTRPCRouter({
  list: authedProcedure.query(() => repo.findMany()),
  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => repo.findById(input.id)),
  create: authedProcedure
    .input(createOrderInput)
    .mutation(({ input }) => repo.insert(input)),
});
```

```ts
// trpc/routers/_app.ts
import { ordersRouter } from "@/features/orders/server/router";

export const appRouter = createTRPCRouter({
  orders: ordersRouter,
  // ...other feature routers
});
```

### 5. DB schema is centralized, repositories are per-feature

Table definitions live in `db/schema/` because Drizzle migrations need a single source. But the repository (queries) lives inside the feature.

```ts
// db/schema/orders.ts — table definition
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  total: integer("total").notNull(),
  createdAt: text("created_at").notNull(),
});
```

```ts
// features/orders/server/repository.ts — queries
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function findById(id: string) {
  return db.query.orders.findFirst({ where: eq(orders.id, id) });
}
```

### 6. Trigger.dev tasks live in `trigger/`, wrappers in features

The task definition must be in `trigger/tasks/` (Trigger.dev convention). The feature exposes a `jobs.ts` helper to enqueue tasks without importing from trigger directly.

```ts
// trigger/tasks/send-order-shipped-sms.ts — task definition
import { task, AbortTaskRunError } from "@trigger.dev/sdk/v3";
import { OrderShippedSms } from "@/features/orders/server/sms/order-shipped-sms";
import { smsManager } from "@/lib/sms/config";

export const sendOrderShippedSms = task({
  id: "send-order-shipped-sms",
  retry: { maxAttempts: 5 },
  run: async ({ orderId, phone }: { orderId: string; phone: string }) => {
    const sms = new OrderShippedSms(orderId, phone);
    if (!(await sms.shouldSend())) throw new AbortTaskRunError("Skipped");
    return smsManager.send(sms);
  },
});
```

```ts
// features/orders/server/jobs.ts — enqueue wrapper
import { sendOrderShippedSms } from "@/trigger/tasks/send-order-shipped-sms";

export function enqueueOrderShippedSms(orderId: string, phone: string) {
  return sendOrderShippedSms.trigger({ orderId, phone });
}
```

### 7. Shared vs feature-specific

| What | Where | Why |
|------|-------|-----|
| shadcn primitives | `components/ui/` | Auto-generated, shared globally |
| Composed shared components | `components/` | Header, Footer, ThemeToggle — used everywhere |
| Feature components | `features/[name]/components/` | Only used in that feature |
| General hooks | `hooks/` | `useMobile`, `useDebounce` — generic |
| Feature hooks | `features/[name]/hooks/` | Feature-specific logic |
| Global state | `store/` | Auth, theme, sidebar — app-wide |
| Feature state | `features/[name]/store/` | Zustand store for that domain |
| Libraries | `lib/` | SMS, cache, email — framework-level infrastructure |
| Utils | `lib/utils.ts` | `cn()`, generic formatters |
| Feature utils | `features/[name]/utils/` | Domain-specific formatters/constants |

### 8. Import rules

- `app/` imports from `features/` (views), `components/` (shared), `trpc/` (server caller)
- `features/` imports from `lib/`, `db/`, `components/ui/`, `hooks/`, `store/`, `trpc/init`
- `features/` NEVER imports from other `features/` — if two features share logic, extract to `lib/`
- `lib/` NEVER imports from `features/`, `app/`, or `trpc/`
- `db/schema/` NEVER imports from `features/`

### 9. Naming conventions

- **Directories**: kebab-case (`order-items/`, `send-form.tsx`)
- **Components**: PascalCase exports (`OrderCard`, `SendForm`)
- **Files**: kebab-case (`order-card.tsx`, `use-order-filters.ts`)
- **DB tables**: plural snake_case (`orders`, `order_items`)
- **DB columns**: camelCase (`createdAt`, `orderId`)
- **tRPC routers**: camelCase (`ordersRouter`)
- **Zustand stores**: `use[Name]Store` (`useOrderFiltersStore`)
- **Zod schemas**: camelCase + descriptor (`createOrderInput`, `orderOutput`)

### 10. When to create a new feature

Create a feature when you have a distinct domain with its own:
- UI (components/views)
- Data (DB table or external API)
- Logic (business rules)

Small utilities that don't own a domain belong in `lib/` or `hooks/`.

Examples of good features: `orders`, `auth`, `billing`, `notifications`, `settings`, `onboarding`.

NOT a feature: a shared date picker, a utility function, a global theme toggle.
