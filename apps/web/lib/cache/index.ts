import { memoryCache } from "./providers/memory";
import { upstashCache } from "./providers/upstash";
import type { CacheProvider } from "./types";

let instance: CacheProvider | null = null;

export function getCache(): CacheProvider {
	if (instance) return instance;

	const provider = process.env.CACHE_PROVIDER;

	if (provider === "memory") {
		instance = memoryCache;
	} else {
		instance = upstashCache;
	}

	return instance;
}
