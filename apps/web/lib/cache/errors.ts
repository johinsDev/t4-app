export class CacheError extends Error {
	readonly code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = "CacheError";
		this.code = code;
	}
}

export class ProviderError extends CacheError {
	readonly provider: string;

	constructor(provider: string, message: string) {
		super(`[${provider}] ${message}`, "PROVIDER_ERROR");
		this.name = "ProviderError";
		this.provider = provider;
	}
}
