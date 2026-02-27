import { CacheManager } from "./cache-manager";
import type { ProviderConfig } from "./types";

const provider = (process.env.CACHE_PROVIDER ?? "memory") as "memory" | "upstash" | "redis";

const stores: Record<string, ProviderConfig> = {
	memory: { provider: "memory" },
};

if (provider === "upstash" || process.env.UPSTASH_REDIS_REST_URL) {
	stores.upstash = { provider: "upstash" };
}

if (provider === "redis" || process.env.REDIS_URL) {
	stores.redis = { provider: "redis", url: process.env.REDIS_URL ?? "" };
}

export const cacheManager = new CacheManager({
	default: provider,
	stores,
});
