import type { WhatsAppResponse } from "./types";
import { WhatsAppMessage } from "./whatsapp-message";
import type { WhatsAppSender } from "./whatsapp-sender";

/**
 * Base class for WhatsApp notifications. Subclasses implement `prepare()`
 * to configure the message, and optionally `shouldSend()` for
 * conditional sending in queue handlers.
 *
 * ```ts
 * export class OtpWhatsApp extends BaseWhatsApp {
 *   readonly #phone: string;
 *   readonly #code: string;
 *
 *   constructor(phone: string, code: string) {
 *     super();
 *     this.#phone = phone;
 *     this.#code = code;
 *   }
 *
 *   prepare() {
 *     this.message
 *       .to(this.#phone)
 *       .emoji("lock")
 *       .content(" ")
 *       .bold(this.#code)
 *       .content(" is your verification code.");
 *   }
 * }
 * ```
 */
export abstract class BaseWhatsApp {
	/**
	 * Track whether `build()` has been called to avoid
	 * running `prepare()` multiple times.
	 */
	#built = false;

	/**
	 * The message builder. Use in `prepare()` to set
	 * recipient, content, and optional sender.
	 */
	message = new WhatsAppMessage();

	/**
	 * Configure the WhatsApp message (recipient, content, from).
	 * Called once by `build()`.
	 */
	abstract prepare(): void | Promise<void>;

	/**
	 * Override to conditionally skip sending.
	 * Check this in your queue handler before calling send.
	 */
	shouldSend(): boolean | Promise<boolean> {
		return true;
	}

	/**
	 * Build the message by calling `prepare()`.
	 * Safe to call multiple times — only runs once.
	 */
	async build(): Promise<void> {
		if (this.#built) return;
		this.#built = true;
		await this.prepare();
	}

	/**
	 * Build the message and send it via the given sender.
	 * Called by WhatsAppSender when it receives a BaseWhatsApp instance.
	 */
	async send(sender: WhatsAppSender): Promise<WhatsAppResponse> {
		await this.build();
		return sender.sendCompiled(this.message.toData());
	}
}
