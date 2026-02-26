import { ProviderError, RateLimitError } from "../errors";
import type {
	TwilioWhatsAppProviderConfig,
	WhatsAppMessageData,
	WhatsAppResponse,
	WhatsAppTransport,
} from "../types";

export class TwilioTransport implements WhatsAppTransport {
	readonly name = "twilio";
	readonly #config: TwilioWhatsAppProviderConfig;
	#client: unknown;

	constructor(config: TwilioWhatsAppProviderConfig) {
		this.#config = config;
	}

	async #getClient() {
		if (!this.#client) {
			const twilio = await import("twilio");
			this.#client = twilio.default(this.#config.accountSid, this.#config.authToken);
		}
		return this.#client as import("twilio").Twilio;
	}

	async send(message: WhatsAppMessageData): Promise<WhatsAppResponse> {
		const client = await this.#getClient();
		const from = message.from ? `whatsapp:${message.from}` : this.#config.from;

		try {
			const mediaUrl = message.mediaUrl ? [message.mediaUrl] : undefined;

			const result = message.contentSid
				? await client.messages.create({
						to: `whatsapp:${message.to}`,
						from,
						contentSid: message.contentSid,
						contentVariables: message.contentVariables
							? JSON.stringify(message.contentVariables)
							: undefined,
					})
				: await client.messages.create({
						to: `whatsapp:${message.to}`,
						from,
						body: message.content || undefined,
						mediaUrl,
					});

			return {
				status: result.status === "queued" ? "queued" : "sent",
				providerMessageId: result.sid,
				provider: this.name,
				timestamp: new Date().toISOString(),
			};
		} catch (error: unknown) {
			if (error && typeof error === "object" && "status" in error) {
				const twilioError = error as { status: number; code: number; message: string };
				if (twilioError.status === 429) {
					throw new RateLimitError(60_000);
				}
				throw new ProviderError(this.name, twilioError.message, String(twilioError.code));
			}
			throw new ProviderError(this.name, error instanceof Error ? error.message : "Unknown error");
		}
	}
}
