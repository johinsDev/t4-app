export class RateLimitError extends Error {
	readonly code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = "RateLimitError";
		this.code = code;
	}
}

export class RateLimitExceededError extends RateLimitError {
	readonly retryAfterMs: number;
	readonly limit: number;
	readonly remaining: number;

	constructor(retryAfterMs: number, limit: number, remaining: number) {
		super(`Rate limit exceeded. Retry after ${retryAfterMs}ms`, "RATE_LIMIT_EXCEEDED");
		this.name = "RateLimitExceededError";
		this.retryAfterMs = retryAfterMs;
		this.limit = limit;
		this.remaining = remaining;
	}
}

export class ProviderError extends RateLimitError {
	readonly provider: string;

	constructor(provider: string, message: string) {
		super(`[${provider}] ${message}`, "PROVIDER_ERROR");
		this.name = "ProviderError";
		this.provider = provider;
	}
}
