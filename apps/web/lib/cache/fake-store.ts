import { CacheStore } from "./cache-store";
import { MemoryProvider } from "./providers/memory";

/**
 * FakeStore uses an in-memory provider for testing.
 * Use via `cacheManager.fake()` to intercept all cache operations.
 *
 * ```ts
 * const fake = cacheManager.fake();
 * fake.seed("user:123", { name: "Johan" });
 *
 * // ... code that reads from cache ...
 *
 * fake.assertHas("user:123");
 * fake.assertMissing("user:999");
 * cacheManager.restore();
 * ```
 */
export class FakeStore extends CacheStore {
	constructor() {
		super("fake", new MemoryProvider(), "silent");
	}

	/**
	 * Pre-seed a value for testing. The value is JSON-serialized.
	 */
	async seed(key: string, value: unknown): Promise<this> {
		await this.set(key, value);
		return this;
	}

	/**
	 * Assert that a key exists in the cache.
	 */
	async assertHas(key: string): Promise<this> {
		const exists = await this.has(key);
		if (!exists) {
			throw new Error(`Expected cache key "${key}" to exist`);
		}
		return this;
	}

	/**
	 * Assert that a key does NOT exist in the cache.
	 */
	async assertMissing(key: string): Promise<this> {
		const exists = await this.has(key);
		if (exists) {
			throw new Error(`Expected cache key "${key}" to not exist`);
		}
		return this;
	}

	/**
	 * Assert that a key has a specific value.
	 */
	async assertHasValue<T>(key: string, expected: T): Promise<this> {
		const actual = await this.get(key);
		if (actual === null) {
			throw new Error(`Expected cache key "${key}" to exist`);
		}
		if (JSON.stringify(actual) !== JSON.stringify(expected)) {
			throw new Error(
				`Expected cache key "${key}" to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
			);
		}
		return this;
	}
}
