import { Redis } from "@upstash/redis";
import type { CacheProvider } from "../types";

const redis = Redis.fromEnv();

export const upstashCache: CacheProvider = {
	async get(key) {
		return await redis.get(key);
	},

	async set(key, value, ttlSeconds) {
		if (ttlSeconds) {
			await redis.set(key, value, { ex: ttlSeconds });
		} else {
			await redis.set(key, value);
		}
	},

	async del(key) {
		await redis.del(key);
	},

	async has(key) {
		const value = await redis.exists(key);
		return value === 1;
	},
};
