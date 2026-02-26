import { ProviderError } from "../errors";
import type { CacheProvider, RedisProviderConfig } from "../types";

/**
 * Redis provider using ioredis. Traditional Redis client
 * for long-lived server processes.
 *
 * Requires `ioredis` as a dependency:
 * ```bash
 * bun add ioredis
 * ```
 */
export class RedisProvider implements CacheProvider {
	readonly name = "redis";
	readonly #config: RedisProviderConfig;
	#client: import("ioredis").default | undefined;

	constructor(config: RedisProviderConfig) {
		this.#config = config;
	}

	async #getClient(): Promise<import("ioredis").default> {
		if (!this.#client) {
			try {
				const { default: Redis } = await import("ioredis");
				this.#client = new Redis(this.#config.url);
			} catch {
				throw new ProviderError(
					"redis",
					'ioredis is not installed. Run "bun add ioredis" to use the redis provider.',
				);
			}
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
			await client.set(key, value, "EX", ttlSeconds);
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

	async disconnect(): Promise<void> {
		if (this.#client) {
			await this.#client.quit();
			this.#client = undefined;
		}
	}
}
