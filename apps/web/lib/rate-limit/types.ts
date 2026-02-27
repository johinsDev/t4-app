export type LogLevel = "debug" | "info" | "silent";

export interface RateLimitResponse {
	success: boolean;
	limit: number;
	remaining: number;
	reset: number;
}

/**
 * Low-level rate limit driver interface.
 * Providers handle the sliding window algorithm — the RateLimitStore
 * layer adds rule parsing, logging, and convenience methods.
 */
export interface RateLimitProvider {
	readonly name: string;
	limit(key: string, opts: { limit: number; windowMs: number }): Promise<RateLimitResponse>;
}

export interface RateLimitRule {
	limit: number;
	window: string;
}

export interface MemoryProviderConfig {
	provider: "memory";
}

export interface UpstashProviderConfig {
	provider: "upstash";
	url?: string;
	token?: string;
}

export type ProviderConfig = MemoryProviderConfig | UpstashProviderConfig;

export interface RateLimitManagerConfig<T extends Record<string, ProviderConfig>> {
	default: keyof T & string;
	stores: T;
	logLevel?: LogLevel;
	rules: {
		default: RateLimitRule;
		[path: string]: RateLimitRule;
	};
}
