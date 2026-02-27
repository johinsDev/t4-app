import { MemoryProvider } from "./providers/memory";
import { RateLimitStore } from "./rate-limit-store";
import type { RateLimitResponse, RateLimitRule } from "./types";

/**
 * FakeStore for testing. Tracks all checked keys and allows
 * toggling whether requests should be allowed.
 *
 * ```ts
 * const fake = rateLimitManager.fake();
 * fake.shouldAllow = false; // simulate rate limiting
 *
 * // ... code that checks rate limits ...
 *
 * fake.assertLimitChecked("user:123");
 * rateLimitManager.restore();
 * ```
 */
export class FakeStore extends RateLimitStore {
	shouldAllow = true;
	checkedKeys: string[] = [];

	constructor() {
		super("fake", new MemoryProvider(), "silent");
	}

	override async limit(key: string, rule: RateLimitRule): Promise<RateLimitResponse> {
		this.checkedKeys.push(key);
		if (this.shouldAllow) {
			return { success: true, limit: rule.limit, remaining: rule.limit - 1, reset: 0 };
		}
		return { success: false, limit: rule.limit, remaining: 0, reset: Date.now() + 60_000 };
	}

	assertLimitChecked(key: string): this {
		if (!this.checkedKeys.includes(key)) {
			throw new Error(`Expected rate limit to be checked for key "${key}"`);
		}
		return this;
	}

	assertNotChecked(key: string): this {
		if (this.checkedKeys.includes(key)) {
			throw new Error(`Expected rate limit NOT to be checked for key "${key}"`);
		}
		return this;
	}

	assertCheckCount(n: number): this {
		if (this.checkedKeys.length !== n) {
			throw new Error(`Expected ${n} rate limit checks, got ${this.checkedKeys.length}`);
		}
		return this;
	}

	clear(): void {
		this.checkedKeys = [];
		this.shouldAllow = true;
	}
}
