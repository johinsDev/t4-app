import type { RateLimitProvider, RateLimitResponse } from "../types";

/**
 * In-memory sliding window rate limiter.
 * Stores timestamps per key and cleans up expired entries lazily.
 */
export class MemoryProvider implements RateLimitProvider {
	readonly name = "memory";
	readonly #hits = new Map<string, number[]>();

	async limit(key: string, opts: { limit: number; windowMs: number }): Promise<RateLimitResponse> {
		const now = Date.now();
		const windowStart = now - opts.windowMs;

		const timestamps = this.#hits.get(key) ?? [];
		const recent = timestamps.filter((ts) => ts > windowStart);

		const success = recent.length < opts.limit;
		if (success) {
			recent.push(now);
		}

		this.#hits.set(key, recent);

		return {
			success,
			limit: opts.limit,
			remaining: Math.max(0, opts.limit - recent.length),
			reset: now + opts.windowMs,
		};
	}
}
