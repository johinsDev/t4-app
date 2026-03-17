import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
	GetResponse,
	ListResponse,
	PutOptions,
	PutResponse,
	PutSignedUrlOptions,
	StorageProvider,
} from "../types";

interface FileMetadata {
	contentType?: string;
	metadata?: Record<string, string>;
}

export class LocalProvider implements StorageProvider {
	readonly name = "local";
	readonly #basePath: string;

	constructor(diskName: string, basePath?: string) {
		this.#basePath = basePath ?? join(process.cwd(), ".storage", diskName);
	}

	#filePath(key: string): string {
		return join(this.#basePath, key);
	}

	#metaPath(key: string): string {
		return `${this.#filePath(key)}.__meta__.json`;
	}

	async put(
		key: string,
		body: Buffer | Uint8Array | string,
		options?: PutOptions,
	): Promise<PutResponse> {
		const filePath = this.#filePath(key);
		await mkdir(dirname(filePath), { recursive: true });

		const buffer = Buffer.from(body);
		await writeFile(filePath, buffer);

		if (options?.contentType || options?.metadata) {
			const meta: FileMetadata = {
				contentType: options.contentType,
				metadata: options.metadata,
			};
			await writeFile(this.#metaPath(key), JSON.stringify(meta));
		}

		return { key, size: buffer.length, contentType: options?.contentType };
	}

	async get(key: string): Promise<GetResponse | null> {
		try {
			const filePath = this.#filePath(key);
			const body = await readFile(filePath);
			const stats = await stat(filePath);

			let meta: FileMetadata = {};
			try {
				const metaRaw = await readFile(this.#metaPath(key), "utf-8");
				meta = JSON.parse(metaRaw);
			} catch {
				// No metadata file
			}

			return {
				body,
				contentType: meta.contentType,
				metadata: meta.metadata,
				lastModified: stats.mtime,
			};
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
			throw err;
		}
	}

	async delete(key: string): Promise<void> {
		try {
			await rm(this.#filePath(key));
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
		}
		try {
			await rm(this.#metaPath(key));
		} catch {
			// No metadata file
		}
	}

	async exists(key: string): Promise<boolean> {
		try {
			await stat(this.#filePath(key));
			return true;
		} catch {
			return false;
		}
	}

	async list(prefix?: string, _cursor?: string, limit = 100): Promise<ListResponse> {
		try {
			const entries = await this.#listRecursive(this.#basePath);
			const items = entries
				.filter((entry) => !entry.endsWith(".__meta__.json"))
				.map((entry) => {
					const key = entry.slice(this.#basePath.length + 1);
					return key;
				})
				.filter((key) => !prefix || key.startsWith(prefix))
				.slice(0, limit);

			const results = await Promise.all(
				items.map(async (key) => {
					const stats = await stat(this.#filePath(key));
					return { key, size: stats.size, lastModified: stats.mtime };
				}),
			);

			return { items: results, hasMore: false };
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				return { items: [], hasMore: false };
			}
			throw err;
		}
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
		const payload = { key, disk: "local", exp: Date.now() + expiresIn * 1000 };
		return Buffer.from(JSON.stringify(payload)).toString("base64url");
	}

	async #listRecursive(dir: string): Promise<string[]> {
		const entries = await readdir(dir, { withFileTypes: true });
		const files: string[] = [];
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				files.push(...(await this.#listRecursive(fullPath)));
			} else {
				files.push(fullPath);
			}
		}
		return files;
	}
}
