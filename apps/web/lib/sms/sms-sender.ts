import type { BaseSms } from "./base-sms";
import { SMSMessage } from "./sms-message";
import type {
	LogLevel,
	SMSComposeCallback,
	SMSMessageData,
	SMSResponse,
	SMSTransport,
} from "./types";

/**
 * SMSSender wraps a transport and provides a consistent API
 * for sending SMS messages. Instances are cached and managed
 * by the SMSManager.
 */
export class SMSSender {
	readonly name: string;
	readonly #transport: SMSTransport;
	readonly #logLevel: LogLevel;

	constructor(name: string, transport: SMSTransport, logLevel: LogLevel = "info") {
		this.name = name;
		this.#transport = transport;
		this.#logLevel = logLevel;
	}

	/**
	 * Send an SMS using a compose callback or a BaseSms class.
	 *
	 * When receiving a BaseSms instance, delegates to its `send()`
	 * method which calls `build()` then `sendCompiled()`.
	 *
	 * When receiving a callback, creates a new message, invokes the
	 * callback, then sends the compiled message.
	 */
	async send(callbackOrSms: SMSComposeCallback | BaseSms): Promise<SMSResponse> {
		if (typeof callbackOrSms !== "function") {
			return callbackOrSms.send(this);
		}

		const message = new SMSMessage();
		await callbackOrSms(message);
		return this.sendCompiled(message.toData());
	}

	/**
	 * Send a compiled message directly via the transport.
	 * Used internally by BaseSms after building.
	 */
	async sendCompiled(data: SMSMessageData): Promise<SMSResponse> {
		this.#log("info", `sending to ${data.to} via "${this.name}"`);
		const response = await this.#transport.send(data);
		this.#log("info", `sent, provider message id: ${response.providerMessageId}`);
		return response;
	}

	#log(level: "debug" | "info", ...args: unknown[]) {
		if (this.#logLevel === "silent") return;
		if (level === "debug" && this.#logLevel !== "debug") return;
		console.log("[sms]", ...args);
	}
}
