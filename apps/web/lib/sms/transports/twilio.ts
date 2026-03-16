import { getTwilioErrorMessage } from "@/lib/twilio-errors";
import { ProviderError, RateLimitError } from "../errors";
import type { SMSMessageData, SMSResponse, SMSTransport, TwilioProviderConfig } from "../types";

const VERIFY_DELAY_MS = 2000;

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

			await this.#verifyDelivery(client, result.sid);

			return {
				status: result.status === "queued" ? "queued" : "sent",
				providerMessageId: result.sid,
				provider: this.name,
				timestamp: new Date().toISOString(),
			};
		} catch (error: unknown) {
			if (error instanceof ProviderError || error instanceof RateLimitError) {
				throw error;
			}
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

	/**
	 * Wait briefly and check if Twilio marked the message as failed.
	 * Catches async failures that don't throw at `messages.create()` time.
	 */
	async #verifyDelivery(client: import("twilio").Twilio, sid: string): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS));
		const msg = await client.messages(sid).fetch();

		if (msg.status === "failed" || msg.status === "undelivered") {
			const description = getTwilioErrorMessage(msg.errorCode, msg.errorMessage || undefined);
			throw new ProviderError(this.name, description, String(msg.errorCode));
		}
	}
}
