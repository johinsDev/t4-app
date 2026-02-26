import type { WhatsAppMessage } from "./whatsapp-message";

export interface WhatsAppMessageData {
	to: string;
	from?: string;
	content: string;
	mediaUrl?: string;
	contentSid?: string;
	contentVariables?: Record<string, string>;
}

export interface WhatsAppResponse {
	status: "sent" | "queued" | "failed";
	providerMessageId?: string;
	provider: string;
	timestamp: string;
}

export interface WhatsAppTransport {
	readonly name: string;
	send(message: WhatsAppMessageData): Promise<WhatsAppResponse>;
}

export interface TwilioWhatsAppProviderConfig {
	provider: "twilio";
	accountSid: string;
	authToken: string;
	from: string;
}

export interface JsonProviderConfig {
	provider: "json";
}

export type ProviderConfig = TwilioWhatsAppProviderConfig | JsonProviderConfig;

export type LogLevel = "debug" | "info" | "silent";

export interface WhatsAppManagerConfig<T extends Record<string, ProviderConfig>> {
	default: keyof T & string;
	mailers: T;
	logLevel?: LogLevel;
}

/**
 * Callback to compose a WhatsApp message inline
 */
export type WhatsAppComposeCallback = (message: WhatsAppMessage) => void | Promise<void>;

export interface WhatsAppPreview {
	id: string;
	message: WhatsAppMessageData;
	response: WhatsAppResponse;
	sentAt: string;
}
