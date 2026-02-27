import type { EmailMessage } from "./email-message";

export type Recipient = string | { address: string; name?: string };

export interface EmailAttachment {
	filename: string;
	content: string | Buffer;
	contentType?: string;
}

export interface EmailMessageData {
	to: Recipient[];
	from?: Recipient;
	replyTo?: Recipient[];
	cc?: Recipient[];
	bcc?: Recipient[];
	subject: string;
	html?: string;
	text?: string;
	attachments?: EmailAttachment[];
	headers?: Record<string, string>;
	tags?: Array<{ name: string; value: string }>;
	priority?: "low" | "normal" | "high";
}

export interface EmailResponse {
	status: "sent" | "queued" | "failed";
	providerMessageId?: string;
	provider: string;
	timestamp: string;
}

export interface EmailTransport {
	readonly name: string;
	send(message: EmailMessageData): Promise<EmailResponse>;
}

export interface ResendProviderConfig {
	provider: "resend";
	apiKey: string;
}

export interface JsonProviderConfig {
	provider: "json";
}

export type ProviderConfig = ResendProviderConfig | JsonProviderConfig;

export type LogLevel = "debug" | "info" | "silent";

export interface EmailManagerConfig<T extends Record<string, ProviderConfig>> {
	default: keyof T & string;
	mailers: T;
	logLevel?: LogLevel;
}

/**
 * Callback to compose an email message inline
 */
export type EmailComposeCallback = (message: EmailMessage) => void | Promise<void>;

export interface EmailPreview {
	id: string;
	message: EmailMessageData;
	response: EmailResponse;
	sentAt: string;
}
