import { StorageManager } from "./storage-manager";
import type { ProviderConfig } from "./types";

const provider = (process.env.STORAGE_PROVIDER ?? "local") as "local" | "r2";

const disks: Record<string, ProviderConfig> = {
	local: { provider: "local", public: true },
};

if (
	process.env.R2_ACCOUNT_ID &&
	process.env.R2_ACCESS_KEY_ID &&
	process.env.R2_SECRET_ACCESS_KEY &&
	process.env.R2_BUCKET
) {
	disks.r2 = {
		provider: "r2",
		accountId: process.env.R2_ACCOUNT_ID,
		accessKeyId: process.env.R2_ACCESS_KEY_ID,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
		bucket: "MY_BUCKET_NAME",
		publicUrl: process.env.R2_PUBLIC_URL,
	};
}

export const storageManager = new StorageManager({
	default: provider,
	disks,
});
