import { RateLimitManager } from "./rate-limit-manager";
import type { ProviderConfig } from "./types";

const provider = (process.env.RATE_LIMIT_PROVIDER ?? "memory") as "memory" | "upstash";

const stores: Record<string, ProviderConfig> = {
	memory: { provider: "memory" },
};

if (provider === "upstash" || process.env.UPSTASH_REDIS_REST_URL) {
	stores.upstash = { provider: "upstash" };
}

export const rateLimitManager = new RateLimitManager({
	default: provider,
	stores,
	rules: {
		default: { limit: 60, window: "60s" },
		"api/auth": { limit: 10, window: "60s" },
		"api/trpc": { limit: 30, window: "60s" },
	},
});
