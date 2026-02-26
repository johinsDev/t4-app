import { SMSMessage } from "./sms-message";
import type { SMSSender } from "./sms-sender";
import type { SMSResponse } from "./types";

/**
 * Base class for SMS notifications. Subclasses implement `prepare()`
 * to configure the message, and optionally `shouldSend()` for
 * conditional sending in queue handlers.
 *
 * ```ts
 * export class OrderShippedSms extends BaseSms {
 *   readonly #orderId: string;
 *   readonly #phone: string;
 *
 *   constructor(orderId: string, phone: string) {
 *     super();
 *     this.#orderId = orderId;
 *     this.#phone = phone;
 *   }
 *
 *   prepare() {
 *     this.message.to(this.#phone).content(`Order ${this.#orderId} shipped!`);
 *   }
 * }
 * ```
 */
export abstract class BaseSms {
	/**
	 * Track whether `build()` has been called to avoid
	 * running `prepare()` multiple times.
	 */
	#built = false;

	/**
	 * The message builder. Use in `prepare()` to set
	 * recipient, content, and optional sender.
	 */
	message = new SMSMessage();

	/**
	 * Configure the SMS message (recipient, content, from).
	 * Called once by `build()`.
	 */
	abstract prepare(): void | Promise<void>;

	/**
	 * Override to conditionally skip sending.
	 * Check this in your queue handler before calling send.
	 *
	 * ```ts
	 * // In a Trigger.dev task handler:
	 * if (await sms.shouldSend()) {
	 *   await smsManager.send(sms);
	 * }
	 * ```
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
	 * Called by SMSSender when it receives a BaseSms instance.
	 */
	async send(sender: SMSSender): Promise<SMSResponse> {
		await this.build();
		return sender.sendCompiled(this.message.toData());
	}
}
