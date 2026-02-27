import type { RateLimitProvider, RateLimitResponse, UpstashProviderConfig } from "../types";

/**
 * Upstash rate limit provider. Serverless-friendly (REST-based).
 * Uses `@upstash/ratelimit` with sliding window algorithm.
 * Caches Ratelimit instances by limit:windowMs key since upstash
 * requires window config at construction time.
 */
export class UpstashProvider implements RateLimitProvider {
	readonly name = "upstash";
	readonly #config: UpstashProviderConfig;
	#redis: import("@upstash/redis").Redis | undefined;
	readonly #instances = new Map<string, import("@upstash/ratelimit").Ratelimit>();

	constructor(config: UpstashProviderConfig) {
		this.#config = config;
	}

	async #getRedis(): Promise<import("@upstash/redis").Redis> {
		if (!this.#redis) {
			const { Redis } = await import("@upstash/redis");
			this.#redis =
				this.#config.url && this.#config.token
					? new Redis({ url: this.#config.url, token: this.#config.token })
					: Redis.fromEnv();
		}
		return this.#redis;
	}

	async #getInstance(
		limit: number,
		windowMs: number,
	): Promise<import("@upstash/ratelimit").Ratelimit> {
		const cacheKey = `${limit}:${windowMs}`;
		const cached = this.#instances.get(cacheKey);
		if (cached) return cached;

		const { Ratelimit } = await import("@upstash/ratelimit");
		const redis = await this.#getRedis();
		const windowSec = Math.ceil(windowMs / 1000);
		const instance = new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
		});

		this.#instances.set(cacheKey, instance);
		return instance;
	}

	async limit(key: string, opts: { limit: number; windowMs: number }): Promise<RateLimitResponse> {
		const instance = await this.#getInstance(opts.limit, opts.windowMs);
		const result = await instance.limit(key);

		return {
			success: result.success,
			limit: result.limit,
			remaining: result.remaining,
			reset: result.reset,
		};
	}
}
