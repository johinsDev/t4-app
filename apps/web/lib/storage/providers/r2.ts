import { ProviderError } from "../errors";
import type {
	GetResponse,
	ListResponse,
	PutOptions,
	PutResponse,
	PutSignedUrlOptions,
	R2ProviderConfig,
	StorageProvider,
} from "../types";

type S3Client = import("@aws-sdk/client-s3").S3Client;

let cachedClient: S3Client | null = null;

async function getClient(config: R2ProviderConfig): Promise<S3Client> {
	if (cachedClient) return cachedClient;

	const { S3Client } = await import("@aws-sdk/client-s3");
	cachedClient = new S3Client({
		region: "auto",
		endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});
	return cachedClient;
}

export class R2Provider implements StorageProvider {
	readonly name = "r2";
	readonly #config: R2ProviderConfig;

	constructor(config: R2ProviderConfig) {
		this.#config = config;
	}

	async put(
		key: string,
		body: Buffer | Uint8Array | string,
		options?: PutOptions,
	): Promise<PutResponse> {
		const { PutObjectCommand } = await import("@aws-sdk/client-s3");
		const client = await getClient(this.#config);
		const buffer = Buffer.from(body);

		try {
			await client.send(
				new PutObjectCommand({
					Bucket: this.#config.bucket,
					Key: key,
					Body: buffer,
					ContentType: options?.contentType,
					Metadata: options?.metadata,
				}),
			);
		} catch (err) {
			throw new ProviderError("r2", (err as Error).message);
		}

		return { key, size: buffer.length, contentType: options?.contentType };
	}

	async get(key: string): Promise<GetResponse | null> {
		const { GetObjectCommand } = await import("@aws-sdk/client-s3");
		const client = await getClient(this.#config);

		try {
			const response = await client.send(
				new GetObjectCommand({
					Bucket: this.#config.bucket,
					Key: key,
				}),
			);

			const body = await response.Body?.transformToByteArray();
			if (!body) return null;

			return {
				body: Buffer.from(body),
				contentType: response.ContentType,
				metadata: response.Metadata,
				lastModified: response.LastModified,
			};
		} catch (err) {
			if ((err as { name?: string }).name === "NoSuchKey") return null;
			throw new ProviderError("r2", (err as Error).message);
		}
	}

	async delete(key: string): Promise<void> {
		const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
		const client = await getClient(this.#config);

		try {
			await client.send(
				new DeleteObjectCommand({
					Bucket: this.#config.bucket,
					Key: key,
				}),
			);
		} catch (err) {
			throw new ProviderError("r2", (err as Error).message);
		}
	}

	async exists(key: string): Promise<boolean> {
		const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
		const client = await getClient(this.#config);

		try {
			await client.send(
				new HeadObjectCommand({
					Bucket: this.#config.bucket,
					Key: key,
				}),
			);
			return true;
		} catch {
			return false;
		}
	}

	async list(prefix?: string, cursor?: string, limit = 100): Promise<ListResponse> {
		const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
		const client = await getClient(this.#config);

		try {
			const response = await client.send(
				new ListObjectsV2Command({
					Bucket: this.#config.bucket,
					Prefix: prefix,
					ContinuationToken: cursor,
					MaxKeys: limit,
				}),
			);

			const items = (response.Contents ?? [])
				.filter((obj) => obj.Key != null)
				.map((obj) => ({
					key: obj.Key as string,
					size: obj.Size ?? 0,
					lastModified: obj.LastModified,
				}));

			return {
				items,
				hasMore: response.IsTruncated ?? false,
				cursor: response.NextContinuationToken,
			};
		} catch (err) {
			throw new ProviderError("r2", (err as Error).message);
		}
	}

	async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
		const { GetObjectCommand } = await import("@aws-sdk/client-s3");
		const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
		const client = await getClient(this.#config);

		const command = new GetObjectCommand({
			Bucket: this.#config.bucket,
			Key: key,
		});

		return getSignedUrl(client, command, { expiresIn });
	}

	async putSignedUrl(key: string, options?: PutSignedUrlOptions): Promise<string> {
		const { PutObjectCommand } = await import("@aws-sdk/client-s3");
		const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
		const client = await getClient(this.#config);

		const command = new PutObjectCommand({
			Bucket: this.#config.bucket,
			Key: key,
			ContentType: options?.contentType,
			ContentLength: options?.maxSize,
		});

		return getSignedUrl(client, command, { expiresIn: options?.expiresIn ?? 3600 });
	}

	getPublicUrl(key: string): string {
		if (!this.#config.publicUrl) {
			throw new Error(
				"R2_PUBLIC_URL is not configured. Set it to your R2 public bucket URL or use getSignedUrl for private files.",
			);
		}
		return `${this.#config.publicUrl.replace(/\/+$/, "")}/${key}`;
	}
}
