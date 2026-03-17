import { FakeDisk } from "./fake-disk";
import { LocalProvider } from "./providers/local";
import { MemoryProvider } from "./providers/memory";
import { R2Provider } from "./providers/r2";
import { StorageDisk } from "./storage-disk";
import type {
	GetResponse,
	ListResponse,
	LogLevel,
	ProviderConfig,
	PutOptions,
	PutResponse,
	PutSignedUrlOptions,
	StorageManagerConfig,
	StorageProvider,
} from "./types";

function createProvider(diskName: string, config: ProviderConfig): StorageProvider {
	switch (config.provider) {
		case "memory":
			return new MemoryProvider();
		case "local":
			return new LocalProvider(diskName, config.basePath);
		case "r2":
			return new R2Provider(config);
	}
}

export class StorageManager<TDisks extends Record<string, ProviderConfig>> {
	readonly #config: StorageManagerConfig<TDisks>;
	readonly #logLevel: LogLevel;
	readonly #disksCache = new Map<string, StorageDisk>();
	#fakeDisk?: FakeDisk;

	constructor(config: StorageManagerConfig<TDisks>) {
		this.#config = config;
		this.#logLevel = config.logLevel ?? "info";
	}

	use<K extends keyof TDisks & string>(diskName?: K): StorageDisk {
		const name = diskName ?? this.#config.default;

		if (!name) {
			throw new Error("Cannot create disk instance. No default disk is defined in the config");
		}

		if (!this.#config.disks[name]) {
			throw new Error(`Unknown disk "${name}". Make sure it is configured in the disks config`);
		}

		if (this.#fakeDisk) {
			return this.#fakeDisk;
		}

		const cached = this.#disksCache.get(name);
		if (cached) {
			this.#log("debug", `using disk from cache. name: "${name}"`);
			return cached;
		}

		this.#log("debug", `creating disk. name: "${name}"`);
		const provider = createProvider(name, this.#config.disks[name]);
		const disk = new StorageDisk(
			name,
			provider,
			this.#logLevel,
			this.#config.disks[name].public ?? false,
		);
		this.#disksCache.set(name, disk);

		return disk;
	}

	fake(): FakeDisk {
		this.restore();
		this.#log("debug", "enabling fake mode");
		this.#fakeDisk = new FakeDisk();
		return this.#fakeDisk;
	}

	restore(): void {
		if (this.#fakeDisk) {
			this.#log("debug", "restoring from fake mode");
			this.#fakeDisk = undefined;
		}
	}

	// ── Shorthand methods (delegate to default disk) ────────────

	put(key: string, body: Buffer | Uint8Array | string, options?: PutOptions): Promise<PutResponse> {
		return this.use().put(key, body, options);
	}

	get(key: string): Promise<GetResponse | null> {
		return this.use().get(key);
	}

	delete(key: string): Promise<void> {
		return this.use().delete(key);
	}

	exists(key: string): Promise<boolean> {
		return this.use().exists(key);
	}

	list(prefix?: string, cursor?: string, limit?: number): Promise<ListResponse> {
		return this.use().list(prefix, cursor, limit);
	}

	getSignedUrl(key: string, expiresIn?: number): Promise<string> {
		return this.use().getSignedUrl(key, expiresIn);
	}

	putSignedUrl(key: string, options?: PutSignedUrlOptions): Promise<string> {
		return this.use().putSignedUrl(key, options);
	}

	getPublicUrl(key: string): string {
		return this.use().getPublicUrl(key);
	}

	getDownloadUrl(key: string, expiresIn?: number): Promise<string> {
		return this.use().getDownloadUrl(key, expiresIn);
	}

	#log(level: "debug" | "info", ...args: unknown[]) {
		if (this.#logLevel === "silent") return;
		if (level === "debug" && this.#logLevel !== "debug") return;
		console.log("[storage]", ...args);
	}
}
