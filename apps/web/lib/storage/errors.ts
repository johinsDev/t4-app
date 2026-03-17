export class StorageError extends Error {
	readonly code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = "StorageError";
		this.code = code;
	}
}

export class ProviderError extends StorageError {
	readonly provider: string;
	readonly providerCode?: string;

	constructor(provider: string, message: string, providerCode?: string) {
		super(`[${provider}] ${message}`, "PROVIDER_ERROR");
		this.name = "ProviderError";
		this.provider = provider;
		this.providerCode = providerCode;
	}
}

export class FileNotFoundError extends StorageError {
	readonly key: string;

	constructor(key: string) {
		super(`File not found: ${key}`, "FILE_NOT_FOUND");
		this.name = "FileNotFoundError";
		this.key = key;
	}
}

export class SignedUrlError extends StorageError {
	constructor(message: string) {
		super(message, "SIGNED_URL_ERROR");
		this.name = "SignedUrlError";
	}
}
