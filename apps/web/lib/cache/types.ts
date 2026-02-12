export interface CacheProvider {
	get<T = string>(key: string): Promise<T | null>;
	set(key: string, value: string, ttlSeconds?: number): Promise<void>;
	del(key: string): Promise<void>;
	has(key: string): Promise<boolean>;
}
