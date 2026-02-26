import type { CacheProvider, UpstashProviderConfig } from "../types";

/**
 * Upstash Redis provider. Serverless-friendly (REST-based).
 * Uses `Redis.fromEnv()` by default (reads UPSTASH_REDIS_REST_URL
 * and UPSTASH_REDIS_REST_TOKEN), or accepts explicit url/token.
 */
export class UpstashProvider implements CacheProvider {
	readonly name = "upstash";
	readonly #config: UpstashProviderConfig;
	#client: import("@upstash/redis").Redis | undefined;

	constructor(config: UpstashProviderConfig) {
		this.#config = config;
	}

	async #getClient(): Promise<import("@upstash/redis").Redis> {
		if (!this.#client) {
			const { Redis } = await import("@upstash/redis");
			this.#client =
				this.#config.url && this.#config.token
					? new Redis({ url: this.#config.url, token: this.#config.token })
					: Redis.fromEnv();
		}
		return this.#client;
	}

	async get(key: string): Promise<string | null> {
		const client = await this.#getClient();
		return client.get(key);
	}

	async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
		const client = await this.#getClient();
		if (ttlSeconds) {
			await client.set(key, value, { ex: ttlSeconds });
		} else {
			await client.set(key, value);
		}
	}

	async delete(key: string): Promise<void> {
		const client = await this.#getClient();
		await client.del(key);
	}

	async has(key: string): Promise<boolean> {
		const client = await this.#getClient();
		const result = await client.exists(key);
		return result === 1;
	}

	async flush(): Promise<void> {
		const client = await this.#getClient();
		await client.flushdb();
	}
}
