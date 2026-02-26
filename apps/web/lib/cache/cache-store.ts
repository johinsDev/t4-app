import type { CacheProvider, LogLevel } from "./types";

/**
 * CacheStore wraps a provider and adds JSON serialization,
 * convenience methods, and logging. Instances are cached and
 * managed by the CacheManager.
 */
export class CacheStore {
	readonly name: string;
	readonly #provider: CacheProvider;
	readonly #logLevel: LogLevel;

	constructor(name: string, provider: CacheProvider, logLevel: LogLevel = "info") {
		this.name = name;
		this.#provider = provider;
		this.#logLevel = logLevel;
	}

	/**
	 * Get a value by key. Returns null if not found.
	 * Values are deserialized from JSON automatically.
	 */
	async get<T = unknown>(key: string): Promise<T | null> {
		this.#log("debug", `get "${key}"`);
		const raw = await this.#provider.get(key);
		if (raw === null) return null;
		try {
			return JSON.parse(raw) as T;
		} catch {
			return raw as T;
		}
	}

	/**
	 * Set a value with optional TTL in seconds.
	 * Values are serialized to JSON automatically.
	 */
	async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
		this.#log("debug", `set "${key}"${ttlSeconds ? ` ttl=${ttlSeconds}s` : ""}`);
		const serialized = JSON.stringify(value);
		await this.#provider.set(key, serialized, ttlSeconds);
	}

	/**
	 * Get a value or compute it if missing.
	 * The factory is only called on cache miss, and the result
	 * is stored with the given TTL.
	 */
	async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached !== null) {
			this.#log("debug", `hit "${key}"`);
			return cached;
		}

		this.#log("debug", `miss "${key}", computing`);
		const value = await factory();
		await this.set(key, value, ttlSeconds);
		return value;
	}

	/**
	 * Check if a key exists in the cache.
	 */
	async has(key: string): Promise<boolean> {
		return this.#provider.has(key);
	}

	/**
	 * Check if a key does NOT exist in the cache.
	 */
	async missing(key: string): Promise<boolean> {
		return !(await this.has(key));
	}

	/**
	 * Delete a key from the cache.
	 */
	async delete(key: string): Promise<void> {
		this.#log("debug", `delete "${key}"`);
		await this.#provider.delete(key);
	}

	/**
	 * Delete multiple keys from the cache.
	 */
	async deleteMany(keys: string[]): Promise<void> {
		this.#log("debug", `deleteMany [${keys.join(", ")}]`);
		await Promise.all(keys.map((key) => this.#provider.delete(key)));
	}

	/**
	 * Remove all entries from the cache.
	 */
	async flush(): Promise<void> {
		this.#log("info", `flushing store "${this.name}"`);
		await this.#provider.flush();
	}

	/**
	 * Disconnect the underlying provider (if supported).
	 */
	async disconnect(): Promise<void> {
		await this.#provider.disconnect?.();
	}

	#log(level: "debug" | "info", ...args: unknown[]) {
		if (this.#logLevel === "silent") return;
		if (level === "debug" && this.#logLevel !== "debug") return;
		console.log("[cache]", ...args);
	}
}
