import type { BaseMail } from "./base-mail";
import { EmailMessage } from "./email-message";
import type {
	EmailComposeCallback,
	EmailMessageData,
	EmailResponse,
	EmailTransport,
	LogLevel,
} from "./types";

/**
 * EmailSender wraps a transport and provides a consistent API
 * for sending email messages. Instances are cached and managed
 * by the EmailManager.
 */
export class EmailSender {
	readonly name: string;
	readonly #transport: EmailTransport;
	readonly #logLevel: LogLevel;

	constructor(name: string, transport: EmailTransport, logLevel: LogLevel = "info") {
		this.name = name;
		this.#transport = transport;
		this.#logLevel = logLevel;
	}

	/**
	 * Send an email using a compose callback or a BaseMail class.
	 *
	 * When receiving a BaseMail instance, delegates to its `send()`
	 * method which calls `build()` then `sendCompiled()`.
	 *
	 * When receiving a callback, creates a new message, invokes the
	 * callback, then sends the compiled message.
	 */
	async send(callbackOrMail: EmailComposeCallback | BaseMail): Promise<EmailResponse> {
		if (typeof callbackOrMail !== "function") {
			return callbackOrMail.send(this);
		}

		const message = new EmailMessage();
		await callbackOrMail(message);
		return this.sendCompiled(message.toData());
	}

	/**
	 * Send a compiled message directly via the transport.
	 * Used internally by BaseMail after building.
	 */
	async sendCompiled(data: EmailMessageData): Promise<EmailResponse> {
		const toAddrs = data.to.map((r) => (typeof r === "string" ? r : r.address)).join(", ");
		this.#log("info", `sending to ${toAddrs} via "${this.name}"`);
		const response = await this.#transport.send(data);
		this.#log("info", `sent, provider message id: ${response.providerMessageId}`);
		return response;
	}

	#log(level: "debug" | "info", ...args: unknown[]) {
		if (this.#logLevel === "silent") return;
		if (level === "debug" && this.#logLevel !== "debug") return;
		console.log("[email]", ...args);
	}
}
