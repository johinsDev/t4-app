import type { CacheProvider } from "../types";

const store = new Map<string, string>();

export const memoryCache: CacheProvider = {
	async get<T = string>(key: string): Promise<T | null> {
		const value = store.get(key);
		return (value ? JSON.parse(value) : null) as T | null;
	},

	async set(key: string, value: string): Promise<void> {
		store.set(key, JSON.stringify(value));
	},

	async del(key) {
		store.delete(key);
	},

	async has(key) {
		return store.has(key);
	},
};
