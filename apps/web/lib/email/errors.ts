export class EmailError extends Error {
	readonly code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = "EmailError";
		this.code = code;
	}
}

export class InvalidEmailError extends EmailError {
	constructor(email: string) {
		super(`Invalid email address: ${email}`, "INVALID_EMAIL");
		this.name = "InvalidEmailError";
	}
}

export class InvalidMessageError extends EmailError {
	constructor(reason: string) {
		super(`Invalid message: ${reason}`, "INVALID_MESSAGE");
		this.name = "InvalidMessageError";
	}
}

export class RateLimitError extends EmailError {
	readonly retryAfterMs: number;

	constructor(retryAfterMs: number) {
		super(`Rate limited. Retry after ${retryAfterMs}ms`, "RATE_LIMIT");
		this.name = "RateLimitError";
		this.retryAfterMs = retryAfterMs;
	}
}

export class ProviderError extends EmailError {
	readonly provider: string;
	readonly providerCode?: string;

	constructor(provider: string, message: string, providerCode?: string) {
		super(`[${provider}] ${message}`, "PROVIDER_ERROR");
		this.name = "ProviderError";
		this.provider = provider;
		this.providerCode = providerCode;
	}
}
