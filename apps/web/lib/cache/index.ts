import { memoryCache } from "./providers/memory";
import { upstashCache } from "./providers/upstash";
import type { CacheProvider } from "./types";

let instance: CacheProvider | null = null;

export function getCacheProviderName(): "upstash" | "memory" {
	return process.env.CACHE_PROVIDER === "upstash" ? "upstash" : "memory";
}

export function getCache(): CacheProvider {
	if (instance) return instance;

	if (getCacheProviderName() === "upstash") {
		instance = upstashCache;
	} else {
		instance = memoryCache;
	}

	return instance;
}
