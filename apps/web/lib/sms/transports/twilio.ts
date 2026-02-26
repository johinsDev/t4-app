import { ProviderError, RateLimitError } from "../errors";
import type { SMSMessageData, SMSResponse, SMSTransport, TwilioProviderConfig } from "../types";

export class TwilioTransport implements SMSTransport {
	readonly name = "twilio";
	readonly #config: TwilioProviderConfig;
	#client: unknown;

	constructor(config: TwilioProviderConfig) {
		this.#config = config;
	}

	async #getClient() {
		if (!this.#client) {
			const twilio = await import("twilio");
			this.#client = twilio.default(this.#config.accountSid, this.#config.authToken);
		}
		return this.#client as import("twilio").Twilio;
	}

	async send(message: SMSMessageData): Promise<SMSResponse> {
		const client = await this.#getClient();

		try {
			const result = await client.messages.create({
				to: message.to,
				from: message.from ?? this.#config.from,
				body: message.content,
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
