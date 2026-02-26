import { CacheStore } from "./cache-store";
import { FakeStore } from "./fake-store";
import { MemoryProvider } from "./providers/memory";
import { RedisProvider } from "./providers/redis";
import { UpstashProvider } from "./providers/upstash";
import type { CacheManagerConfig, CacheProvider, LogLevel, ProviderConfig } from "./types";

function createProvider(config: ProviderConfig): CacheProvider {
	switch (config.provider) {
		case "memory":
			return new MemoryProvider();
		case "upstash":
			return new UpstashProvider(config);
		case "redis":
			return new RedisProvider(config);
	}
}

/**
 * CacheManager manages multiple named stores, caches them,
 * and provides a simple API for cache operations.
 *
 * ```ts
 * const cache = new CacheManager({
 *   default: "memory",
 *   stores: {
 *     memory: { provider: "memory" },
 *     upstash: { provider: "upstash" },
 *   },
 * });
 *
 * await cache.set("key", "value", 60);
 * const value = await cache.get("key");
 *
 * // Use specific store
 * await cache.use("upstash").set("key", "value");
 *
 * // Compute on miss
 * const user = await cache.getOrSet("user:123", () => fetchUser("123"), 300);
 * ```
 */
export class CacheManager<TStores extends Record<string, ProviderConfig>> {
	readonly #config: CacheManagerConfig<TStores>;
	readonly #logLevel: LogLevel;
	readonly #storesCache = new Map<string, CacheStore>();
	#fakeStore?: FakeStore;

	constructor(config: CacheManagerConfig<TStores>) {
		this.#config = config;
		this.#logLevel = config.logLevel ?? "info";
	}

	/**
	 * Get or create a cached store for a specific provider.
	 * When in fake mode, always returns the fake store.
	 */
	use<K extends keyof TStores & string>(storeName?: K): CacheStore {
		const name = storeName ?? this.#config.default;

		if (!name) {
			throw new Error("Cannot create store instance. No default store is defined in the config");
		}

		if (!this.#config.stores[name]) {
			throw new Error(`Unknown store "${name}". Make sure it is configured in the stores config`);
		}

		/**
		 * Return fake store if active
		 */
		if (this.#fakeStore) {
			return this.#fakeStore;
		}

		/**
		 * Use cached store if available
		 */
		const cached = this.#storesCache.get(name);
		if (cached) {
			this.#log("debug", `using store from cache. name: "${name}"`);
			return cached;
		}

		/**
		 * Create provider and store, then cache it
		 */
		this.#log("debug", `creating store. name: "${name}"`);
		const provider = createProvider(this.#config.stores[name]);
		const store = new CacheStore(name, provider, this.#logLevel);
		this.#storesCache.set(name, store);

		return store;
	}

	/**
	 * Enable fake mode for testing.
	 * All calls to `use()` will return the fake store.
	 */
	fake(): FakeStore {
		this.restore();
		this.#log("debug", "enabling fake mode");
		this.#fakeStore = new FakeStore();
		return this.#fakeStore;
	}

	/**
	 * Disable fake mode and restore normal behavior.
	 */
	restore(): void {
		if (this.#fakeStore) {
			this.#log("debug", "restoring from fake mode");
			this.#fakeStore = undefined;
		}
	}

	/**
	 * Disconnect all cached stores.
	 */
	async disconnectAll(): Promise<void> {
		await Promise.all([...this.#storesCache.values()].map((store) => store.disconnect()));
		this.#storesCache.clear();
	}

	// ── Shorthand methods (delegate to default store) ────────────

	get<T = unknown>(key: string): Promise<T | null> {
		return this.use().get<T>(key);
	}

	set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
		return this.use().set(key, value, ttlSeconds);
	}

	getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
		return this.use().getOrSet<T>(key, factory, ttlSeconds);
	}

	has(key: string): Promise<boolean> {
		return this.use().has(key);
	}

	missing(key: string): Promise<boolean> {
		return this.use().missing(key);
	}

	delete(key: string): Promise<void> {
		return this.use().delete(key);
	}

	deleteMany(keys: string[]): Promise<void> {
		return this.use().deleteMany(keys);
	}

	flush(): Promise<void> {
		return this.use().flush();
	}

	#log(level: "debug" | "info", ...args: unknown[]) {
		if (this.#logLevel === "silent") return;
		if (level === "debug" && this.#logLevel !== "debug") return;
		console.log("[cache]", ...args);
	}
}
