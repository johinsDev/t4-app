import type { BaseMail } from "./base-mail";
import { EmailSender } from "./email-sender";
import { FakeSender } from "./fake-sender";
import { JsonTransport } from "./transports/json";
import { ResendTransport } from "./transports/resend";
import type {
	EmailComposeCallback,
	EmailManagerConfig,
	EmailResponse,
	EmailTransport,
	LogLevel,
	ProviderConfig,
} from "./types";

function createTransport(config: ProviderConfig): EmailTransport {
	switch (config.provider) {
		case "json":
			return new JsonTransport();
		case "resend":
			return new ResendTransport(config);
	}
}

/**
 * EmailManager manages multiple named senders (mailers), caches them,
 * and provides a simple API for sending email messages.
 *
 * ```ts
 * const manager = new EmailManager({
 *   default: "json",
 *   mailers: { json: { provider: "json" } },
 * });
 *
 * // Callback style
 * await manager.send((m) => m.to("user@example.com").subject("Hi").html("<p>Hello</p>"));
 *
 * // Class style
 * await manager.send(new WelcomeMail("John", "john@example.com"));
 *
 * // Specific mailer
 * await manager.use("resend").send(new WelcomeMail("John", "john@example.com"));
 * ```
 */
export class EmailManager<TMailers extends Record<string, ProviderConfig>> {
	readonly #config: EmailManagerConfig<TMailers>;
	readonly #logLevel: LogLevel;
	readonly #sendersCache = new Map<string, EmailSender>();
	#fakeSender?: FakeSender;

	constructor(config: EmailManagerConfig<TMailers>) {
		this.#config = config;
		this.#logLevel = config.logLevel ?? "info";
	}

	/**
	 * Send email using the default mailer.
	 * Accepts a compose callback or a BaseMail class instance.
	 */
	send(callbackOrMail: EmailComposeCallback | BaseMail): Promise<EmailResponse> {
		return this.use().send(callbackOrMail);
	}

	/**
	 * Get or create a cached sender for a specific mailer.
	 * When in fake mode, always returns the fake sender.
	 */
	use<K extends keyof TMailers & string>(mailerName?: K): EmailSender {
		const name = mailerName ?? this.#config.default;

		if (!name) {
			throw new Error("Cannot create sender instance. No default mailer is defined in the config");
		}

		if (!this.#config.mailers[name]) {
			throw new Error(`Unknown mailer "${name}". Make sure it is configured in the mailers config`);
		}

		/**
		 * Return fake sender if active
		 */
		if (this.#fakeSender) {
			return this.#fakeSender;
		}

		/**
		 * Use cached sender if available
		 */
		const cached = this.#sendersCache.get(name);
		if (cached) {
			this.#log("debug", `using sender from cache. name: "${name}"`);
			return cached;
		}

		/**
		 * Create transport and sender, then cache it
		 */
		this.#log("debug", `creating sender. name: "${name}"`);
		const transport = createTransport(this.#config.mailers[name]);
		const sender = new EmailSender(name, transport, this.#logLevel);
		this.#sendersCache.set(name, sender);

		return sender;
	}

	/**
	 * Enable fake mode for testing.
	 * All calls to `use()` will return the fake sender.
	 */
	fake(): FakeSender {
		this.restore();
		this.#log("debug", "enabling fake mode");
		this.#fakeSender = new FakeSender();
		return this.#fakeSender;
	}

	/**
	 * Disable fake mode and restore normal behavior.
	 */
	restore(): void {
		if (this.#fakeSender) {
			this.#log("debug", "restoring from fake mode");
			this.#fakeSender = undefined;
		}
	}

	#log(level: "debug" | "info", ...args: unknown[]) {
		if (this.#logLevel === "silent") return;
		if (level === "debug" && this.#logLevel !== "debug") return;
		console.log("[email]", ...args);
	}
}
