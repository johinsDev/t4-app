import type { BaseWhatsApp } from "./base-whatsapp";
import type {
	LogLevel,
	WhatsAppComposeCallback,
	WhatsAppMessageData,
	WhatsAppResponse,
	WhatsAppTransport,
} from "./types";
import { WhatsAppMessage } from "./whatsapp-message";

/**
 * WhatsAppSender wraps a transport and provides a consistent API
 * for sending WhatsApp messages. Instances are cached and managed
 * by the WhatsAppManager.
 */
export class WhatsAppSender {
	readonly name: string;
	readonly #transport: WhatsAppTransport;
	readonly #logLevel: LogLevel;

	constructor(name: string, transport: WhatsAppTransport, logLevel: LogLevel = "info") {
		this.name = name;
		this.#transport = transport;
		this.#logLevel = logLevel;
	}

	/**
	 * Send a WhatsApp message using a compose callback or a BaseWhatsApp class.
	 *
	 * When receiving a BaseWhatsApp instance, delegates to its `send()`
	 * method which calls `build()` then `sendCompiled()`.
	 *
	 * When receiving a callback, creates a new message, invokes the
	 * callback, then sends the compiled message.
	 */
	async send(
		callbackOrWhatsApp: WhatsAppComposeCallback | BaseWhatsApp,
	): Promise<WhatsAppResponse> {
		if (typeof callbackOrWhatsApp !== "function") {
			return callbackOrWhatsApp.send(this);
		}

		const message = new WhatsAppMessage();
		await callbackOrWhatsApp(message);
		return this.sendCompiled(message.toData());
	}

	/**
	 * Send a compiled message directly via the transport.
	 * Used internally by BaseWhatsApp after building.
	 */
	async sendCompiled(data: WhatsAppMessageData): Promise<WhatsAppResponse> {
		this.#log("info", `sending to ${data.to} via "${this.name}"`);
		const response = await this.#transport.send(data);
		this.#log("info", `sent, provider message id: ${response.providerMessageId}`);
		return response;
	}

	#log(level: "debug" | "info", ...args: unknown[]) {
		if (this.#logLevel === "silent") return;
		if (level === "debug" && this.#logLevel !== "debug") return;
		console.log("[whatsapp]", ...args);
	}
}
