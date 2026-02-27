import { EmailMessage } from "./email-message";
import type { EmailSender } from "./email-sender";
import type { EmailResponse } from "./types";

/**
 * Base class for email notifications. Subclasses implement `prepare()`
 * to configure the message, and optionally `shouldSend()` for
 * conditional sending in queue handlers.
 *
 * ```ts
 * export class WelcomeMail extends BaseMail {
 *   readonly #name: string;
 *   readonly #email: string;
 *
 *   constructor(name: string, email: string) {
 *     super();
 *     this.#name = name;
 *     this.#email = email;
 *   }
 *
 *   async prepare() {
 *     const html = await render(WelcomeEmail({ name: this.#name }));
 *     this.message
 *       .to(this.#email, this.#name)
 *       .subject("Welcome!")
 *       .html(html);
 *   }
 * }
 * ```
 */
export abstract class BaseMail {
	/**
	 * Track whether `build()` has been called to avoid
	 * running `prepare()` multiple times.
	 */
	#built = false;

	/**
	 * The message builder. Use in `prepare()` to set
	 * recipients, subject, html/text content, and more.
	 */
	message = new EmailMessage();

	/**
	 * Configure the email message (recipients, subject, html).
	 * Called once by `build()`.
	 */
	abstract prepare(): void | Promise<void>;

	/**
	 * Override to conditionally skip sending.
	 * Check this in your queue handler before calling send.
	 *
	 * ```ts
	 * // In a Trigger.dev task handler:
	 * if (await mail.shouldSend()) {
	 *   await emailManager.send(mail);
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
	 * Called by EmailSender when it receives a BaseMail instance.
	 */
	async send(sender: EmailSender): Promise<EmailResponse> {
		await this.build();
		return sender.sendCompiled(this.message.toData());
	}
}
