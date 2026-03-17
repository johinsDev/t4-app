import type {
	GetResponse,
	ListResponse,
	LogLevel,
	PutOptions,
	PutResponse,
	PutSignedUrlOptions,
	StorageProvider,
} from "./types";

export class StorageDisk {
	readonly name: string;
	readonly provider: StorageProvider;
	readonly isPublic: boolean;
	readonly #logLevel: LogLevel;

	constructor(
		name: string,
		provider: StorageProvider,
		logLevel: LogLevel = "info",
		isPublic = false,
	) {
		this.name = name;
		this.provider = provider;
		this.#logLevel = logLevel;
		this.isPublic = isPublic;
	}

	async put(
		key: string,
		body: Buffer | Uint8Array | string,
		options?: PutOptions,
	): Promise<PutResponse> {
		this.#log("debug", `put "${key}"`);
		return this.provider.put(key, body, options);
	}

	async get(key: string): Promise<GetResponse | null> {
		this.#log("debug", `get "${key}"`);
		return this.provider.get(key);
	}

	async delete(key: string): Promise<void> {
		this.#log("debug", `delete "${key}"`);
		return this.provider.delete(key);
	}

	async exists(key: string): Promise<boolean> {
		this.#log("debug", `exists "${key}"`);
		return this.provider.exists(key);
	}

	async list(prefix?: string, cursor?: string, limit?: number): Promise<ListResponse> {
		this.#log("debug", `list prefix="${prefix ?? ""}"`);
		return this.provider.list(prefix, cursor, limit);
	}

	async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
		this.#log("debug", `getSignedUrl "${key}"`);
		return this.provider.getSignedUrl(key, expiresIn);
	}

	async putSignedUrl(key: string, options?: PutSignedUrlOptions): Promise<string> {
		this.#log("debug", `putSignedUrl "${key}"`);
		return this.provider.putSignedUrl(key, options);
	}

	getPublicUrl(key: string): string {
		this.#log("debug", `getPublicUrl "${key}"`);
		return this.provider.getPublicUrl(key);
	}

	async getDownloadUrl(key: string, expiresIn?: number): Promise<string> {
		if (this.isPublic) {
			this.#log("debug", `getDownloadUrl (public) "${key}"`);
			return this.provider.getPublicUrl(key);
		}
		this.#log("debug", `getDownloadUrl (signed) "${key}"`);
		return this.provider.getSignedUrl(key, expiresIn);
	}

	#log(level: "debug" | "info", ...args: unknown[]) {
		if (this.#logLevel === "silent") return;
		if (level === "debug" && this.#logLevel !== "debug") return;
		console.log("[storage]", ...args);
	}
}
