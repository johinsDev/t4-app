# Cache Library

Manage application caching with pluggable providers (memory, Upstash, Redis).

## When to use

When the user asks to add caching, set up a cache store, or use cached data in the app.

## Architecture

```
CacheManager → CacheStore → CacheProvider
               (JSON + log)   (raw string storage)
```

- **CacheManager** — factory that creates and caches `CacheStore` instances by name
- **CacheStore** — wraps a provider with JSON serialization, `getOrSet`, logging
- **CacheProvider** — low-level driver (memory, upstash, redis)

All cache code lives in `apps/web/lib/cache/`.

## Configuration

```ts
import { CacheManager } from "@/lib/cache";

const cache = new CacheManager({
	default: "memory",
	stores: {
		memory: { provider: "memory" },
		upstash: { provider: "upstash" }, // reads UPSTASH_REDIS_REST_URL + TOKEN from env
		redis: { provider: "redis", url: "redis://localhost:6379" },
	},
	logLevel: "debug", // "debug" | "info" | "silent"
});
```

### Provider configs

| Provider | Config | Notes |
|----------|--------|-------|
| `memory` | `{ provider: "memory" }` | In-process Map with TTL. Good for dev/tests |
| `upstash` | `{ provider: "upstash", url?, token? }` | Uses `@upstash/redis`. Lazy import. Falls back to env vars |
| `redis` | `{ provider: "redis", url }` | Uses `ioredis`. Lazy import. Throws if not installed |

## Basic usage

```ts
// Use default store
await cache.set("user:123", { name: "Johan" }, 300); // 5 min TTL
const user = await cache.get<User>("user:123");

// Compute-on-miss pattern
const user = await cache.getOrSet("user:123", () => fetchUser("123"), 300);

// Check existence
if (await cache.has("user:123")) { ... }
if (await cache.missing("user:123")) { ... }

// Delete
await cache.delete("user:123");
await cache.deleteMany(["user:123", "user:456"]);
await cache.flush(); // clear all
```

## Named stores

```ts
// Use a specific store
const store = cache.use("upstash");
await store.set("key", "value");

// Stores are cached — calling use("upstash") again returns the same instance
```

## Testing with FakeStore

```ts
import { CacheManager } from "@/lib/cache";

const cache = new CacheManager({
	default: "memory",
	stores: { memory: { provider: "memory" } },
});

// Enable fake mode — all use() calls return the fake store
const fake = cache.fake();

// Pre-seed values
await fake.seed("user:123", { name: "Johan" });

// ... run code that reads/writes cache ...

// Assert on cache state
await fake.assertHas("user:123");
await fake.assertMissing("user:999");
await fake.assertHasValue("user:123", { name: "Johan" });

// Restore normal behavior
cache.restore();
```

## tRPC example

```ts
import { CacheManager } from "@/lib/cache";
import { baseProcedure, createTRPCRouter } from "../init";

const cache = new CacheManager({
	default: "memory",
	stores: { memory: { provider: "memory" } },
});

export const exampleRouter = createTRPCRouter({
	getCachedData: baseProcedure.query(async () => {
		return cache.getOrSet("expensive:data", async () => {
			// expensive computation or DB query
			return { computed: true, at: new Date().toISOString() };
		}, 60); // cache for 60 seconds
	}),
});
```

## Disconnect

Call `disconnectAll()` during graceful shutdown to close provider connections:

```ts
await cache.disconnectAll();
```

## Rules

1. Always provide a TTL when caching data that can become stale
2. Use `getOrSet` instead of manual get-then-set to avoid race conditions
3. Use `memory` provider for dev; `upstash` or `redis` for production
4. Key naming: use `namespace:identifier` pattern (e.g., `user:123`, `settings:global`)
5. The `CacheStore` auto-serializes values to JSON — no need to stringify manually
6. Lazy imports: `@upstash/redis` and `ioredis` are only imported when the provider is first used
