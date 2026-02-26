export type LogLevel = "debug" | "info" | "silent";

/**
 * Low-level cache driver interface.
 * Providers handle raw string storage only — the CacheStore
 * layer adds serialization, logging, and convenience methods.
 */
export interface CacheProvider {
	readonly name: string;
	get(key: string): Promise<string | null>;
	set(key: string, value: string, ttlSeconds?: number): Promise<void>;
	delete(key: string): Promise<void>;
	has(key: string): Promise<boolean>;
	flush(): Promise<void>;
	disconnect?(): Promise<void>;
}

export interface MemoryProviderConfig {
	provider: "memory";
}

export interface UpstashProviderConfig {
	provider: "upstash";
	url?: string;
	token?: string;
}

export interface RedisProviderConfig {
	provider: "redis";
	url: string;
}

export type ProviderConfig = MemoryProviderConfig | UpstashProviderConfig | RedisProviderConfig;

export interface CacheManagerConfig<T extends Record<string, ProviderConfig>> {
	default: keyof T & string;
	stores: T;
	logLevel?: LogLevel;
}
