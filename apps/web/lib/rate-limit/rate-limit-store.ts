import type { LogLevel, RateLimitProvider, RateLimitResponse, RateLimitRule } from "./types";

const WINDOW_UNITS: Record<string, number> = {
	s: 1_000,
	m: 60_000,
	h: 3_600_000,
};

/**
 * Parse a window string like "60s", "5m", "1h" to milliseconds.
 */
export function parseWindow(window: string): number {
	const match = window.match(/^(\d+)(s|m|h)$/);
	if (!match) {
		throw new Error(`Invalid window format "${window}". Use "60s", "5m", or "1h".`);
	}
	// biome-ignore lint/style/noNonNullAssertion: regex guarantees valid group
	return Number(match[1]) * WINDOW_UNITS[match[2]!]!;
}

/**
 * RateLimitStore wraps a provider and adds rule parsing,
 * convenience methods, and logging. Instances are cached and
 * managed by the RateLimitManager.
 */
export class RateLimitStore {
	readonly name: string;
	readonly #provider: RateLimitProvider;
	readonly #logLevel: LogLevel;

	constructor(name: string, provider: RateLimitProvider, logLevel: LogLevel = "info") {
		this.name = name;
		this.#provider = provider;
		this.#logLevel = logLevel;
	}

	/**
	 * Check rate limit for a key against the given rule.
	 * Returns the full response with success, limit, remaining, and reset.
	 */
	async limit(key: string, rule: RateLimitRule): Promise<RateLimitResponse> {
		const windowMs = parseWindow(rule.window);
		this.#log("debug", `limit "${key}" (max ${rule.limit} per ${rule.window})`);
		return this.#provider.limit(key, { limit: rule.limit, windowMs });
	}

	/**
	 * Boolean shorthand — returns true if the request is allowed.
	 */
	async isAllowed(key: string, rule: RateLimitRule): Promise<boolean> {
		const result = await this.limit(key, rule);
		return result.success;
	}

	#log(level: "debug" | "info", ...args: unknown[]) {
		if (this.#logLevel === "silent") return;
		if (level === "debug" && this.#logLevel !== "debug") return;
		console.log("[rate-limit]", ...args);
	}
}
