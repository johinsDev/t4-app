export type LogLevel = "debug" | "info" | "silent";

export interface PutOptions {
	contentType?: string;
	metadata?: Record<string, string>;
}

export interface PutResponse {
	key: string;
	size: number;
	contentType?: string;
}

export interface GetResponse {
	body: Buffer;
	contentType?: string;
	metadata?: Record<string, string>;
	lastModified?: Date;
}

export interface ListItem {
	key: string;
	size: number;
	lastModified?: Date;
}

export interface ListResponse {
	items: ListItem[];
	hasMore: boolean;
	cursor?: string;
}

export interface PutSignedUrlOptions {
	contentType?: string;
	maxSize?: number;
	expiresIn?: number;
}

export interface StorageProvider {
	readonly name: string;
	put(key: string, body: Buffer | Uint8Array | string, options?: PutOptions): Promise<PutResponse>;
	get(key: string): Promise<GetResponse | null>;
	delete(key: string): Promise<void>;
	exists(key: string): Promise<boolean>;
	list(prefix?: string, cursor?: string, limit?: number): Promise<ListResponse>;
	getSignedUrl(key: string, expiresIn?: number): Promise<string>;
	putSignedUrl(key: string, options?: PutSignedUrlOptions): Promise<string>;
	getPublicUrl(key: string): string;
}

export interface MemoryProviderConfig {
	provider: "memory";
	public?: boolean;
}

export interface LocalProviderConfig {
	provider: "local";
	basePath?: string;
	public?: boolean;
}

export interface R2ProviderConfig {
	provider: "r2";
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	publicUrl?: string;
	public?: boolean;
}

export type ProviderConfig = MemoryProviderConfig | LocalProviderConfig | R2ProviderConfig;

export interface StorageManagerConfig<T extends Record<string, ProviderConfig>> {
	default: keyof T & string;
	disks: T;
	logLevel?: LogLevel;
}
