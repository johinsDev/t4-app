import { FakeStore } from "./fake-store";
import { MemoryProvider } from "./providers/memory";
import { UpstashProvider } from "./providers/upstash";
import { RateLimitStore } from "./rate-limit-store";
import type {
	LogLevel,
	ProviderConfig,
	RateLimitManagerConfig,
	RateLimitProvider,
	RateLimitResponse,
	RateLimitRule,
} from "./types";

function createProvider(config: ProviderConfig): RateLimitProvider {
	switch (config.provider) {
		case "memory":
			return new MemoryProvider();
		case "upstash":
			return new UpstashProvider(config);
	}
}

/**
 * RateLimitManager manages named stores, caches them,
 * and provides a simple API for rate limiting.
 *
 * ```ts
 * const rl = new RateLimitManager({
 *   default: "memory",
 *   stores: { memory: { provider: "memory" } },
 *   rules: {
 *     default: { limit: 60, window: "60s" },
 *     "api/auth": { limit: 10, window: "60s" },
 *   },
 * });
 *
 * const result = await rl.limit("user:123", "api/auth");
 * if (!result.success) { // rate limited }
 * ```
 */
export class RateLimitManager<TStores extends Record<string, ProviderConfig>> {
	readonly #config: RateLimitManagerConfig<TStores>;
	readonly #logLevel: LogLevel;
	readonly #storesCache = new Map<string, RateLimitStore>();
	#fakeStore?: FakeStore;

	constructor(config: RateLimitManagerConfig<TStores>) {
		this.#config = config;
		this.#logLevel = config.logLevel ?? "info";
	}

	/**
	 * Get or create a cached store for a specific provider.
	 * When in fake mode, always returns the fake store.
	 */
	use<K extends keyof TStores & string>(storeName?: K): RateLimitStore {
		const name = storeName ?? this.#config.default;

		if (!name) {
			throw new Error("Cannot create store instance. No default store is defined in the config");
		}

		if (!this.#config.stores[name]) {
			throw new Error(`Unknown store "${name}". Make sure it is configured in the stores config`);
		}

		if (this.#fakeStore) {
			return this.#fakeStore;
		}

		const cached = this.#storesCache.get(name);
		if (cached) {
			this.#log("debug", `using store from cache. name: "${name}"`);
			return cached;
		}

		this.#log("debug", `creating store. name: "${name}"`);
		const provider = createProvider(this.#config.stores[name]);
		const store = new RateLimitStore(name, provider, this.#logLevel);
		this.#storesCache.set(name, store);

		return store;
	}

	/**
	 * Look up the rule for a given path, falling back to the default rule.
	 */
	ruleFor(path: string): RateLimitRule {
		return this.#config.rules[path] ?? this.#config.rules.default;
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

	// ── Shorthand methods (delegate to default store) ────────────

	/**
	 * Check rate limit. Accepts a RateLimitRule or a path string
	 * to resolve a rule from the config.
	 */
	limit(key: string, ruleOrPath?: RateLimitRule | string): Promise<RateLimitResponse> {
		const rule =
			typeof ruleOrPath === "string"
				? this.ruleFor(ruleOrPath)
				: (ruleOrPath ?? this.#config.rules.default);
		return this.use().limit(key, rule);
	}

	/**
	 * Boolean shorthand — returns true if the request is allowed.
	 */
	isAllowed(key: string, ruleOrPath?: RateLimitRule | string): Promise<boolean> {
		const rule =
			typeof ruleOrPath === "string"
				? this.ruleFor(ruleOrPath)
				: (ruleOrPath ?? this.#config.rules.default);
		return this.use().isAllowed(key, rule);
	}

	#log(level: "debug" | "info", ...args: unknown[]) {
		if (this.#logLevel === "silent") return;
		if (level === "debug" && this.#logLevel !== "debug") return;
		console.log("[rate-limit]", ...args);
	}
}
