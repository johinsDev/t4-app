export interface SMSMessageData {
	to: string;
	from?: string;
	content: string;
}

export interface SMSResponse {
	status: "sent" | "queued" | "failed";
	providerMessageId?: string;
	provider: string;
	timestamp: string;
}

export interface SMSTransport {
	readonly name: string;
	send(message: SMSMessageData): Promise<SMSResponse>;
}

export interface TwilioProviderConfig {
	provider: "twilio";
	accountSid: string;
	authToken: string;
	from: string;
}

export interface JsonProviderConfig {
	provider: "json";
}

export type ProviderConfig = TwilioProviderConfig | JsonProviderConfig;

export interface SMSManagerConfig<T extends Record<string, ProviderConfig>> {
	default: keyof T & string;
	config: T;
}

export interface SMSJob {
	id: string;
	mailer: string;
	message: SMSMessageData;
	createdAt: string;
	sourceClass?: string;
}

export interface SMSPreview {
	id: string;
	message: SMSMessageData;
	response: SMSResponse;
	segmentInfo: {
		encoding: "GSM-7" | "UCS-2";
		characters: number;
		segments: number;
	};
	sentAt: string;
}
