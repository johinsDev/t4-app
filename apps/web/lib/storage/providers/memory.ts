import type {
	GetResponse,
	ListResponse,
	PutOptions,
	PutResponse,
	PutSignedUrlOptions,
	StorageProvider,
} from "../types";

interface StoredFile {
	body: Buffer;
	contentType?: string;
	metadata?: Record<string, string>;
	lastModified: Date;
}

export class MemoryProvider implements StorageProvider {
	readonly name = "memory";
	readonly files = new Map<string, StoredFile>();

	async put(
		key: string,
		body: Buffer | Uint8Array | string,
		options?: PutOptions,
	): Promise<PutResponse> {
		const buffer = Buffer.from(body);
		this.files.set(key, {
			body: buffer,
			contentType: options?.contentType,
			metadata: options?.metadata,
			lastModified: new Date(),
		});
		return { key, size: buffer.length, contentType: options?.contentType };
	}

	async get(key: string): Promise<GetResponse | null> {
		const file = this.files.get(key);
		if (!file) return null;
		return {
			body: file.body,
			contentType: file.contentType,
			metadata: file.metadata,
			lastModified: file.lastModified,
		};
	}

	async delete(key: string): Promise<void> {
		this.files.delete(key);
	}

	async exists(key: string): Promise<boolean> {
		return this.files.has(key);
	}

	async list(prefix?: string, _cursor?: string, limit = 100): Promise<ListResponse> {
		const items = [...this.files.entries()]
			.filter(([key]) => !prefix || key.startsWith(prefix))
			.map(([key, file]) => ({
				key,
				size: file.body.length,
				lastModified: file.lastModified,
			}))
			.slice(0, limit);

		return { items, hasMore: false };
	}

	async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
		const token = this.#createToken(key, expiresIn);
		return `/api/storage/serve?token=${token}`;
	}

	async putSignedUrl(key: string, options?: PutSignedUrlOptions): Promise<string> {
		const expiresIn = options?.expiresIn ?? 3600;
		const token = this.#createToken(key, expiresIn);
		return `/api/storage/upload?token=${token}`;
	}

	getPublicUrl(key: string): string {
		return `/api/storage/files/${key}`;
	}

	#createToken(key: string, expiresIn: number): string {
		const payload = { key, disk: "memory", exp: Date.now() + expiresIn * 1000 };
		return Buffer.from(JSON.stringify(payload)).toString("base64url");
	}
}
