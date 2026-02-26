import type { BaseWhatsApp } from "./base-whatsapp";
import { FakeSender } from "./fake-sender";
import { JsonTransport } from "./transports/json";
import { TwilioTransport } from "./transports/twilio";
import type {
	LogLevel,
	ProviderConfig,
	WhatsAppComposeCallback,
	WhatsAppManagerConfig,
	WhatsAppResponse,
	WhatsAppTransport,
} from "./types";
import { WhatsAppSender } from "./whatsapp-sender";

function createTransport(config: ProviderConfig): WhatsAppTransport {
	switch (config.provider) {
		case "json":
			return new JsonTransport();
		case "twilio":
			return new TwilioTransport(config);
	}
}

/**
 * WhatsAppManager manages multiple named senders (mailers), caches them,
 * and provides a simple API for sending WhatsApp messages.
 *
 * ```ts
 * const manager = new WhatsAppManager({
 *   default: "json",
 *   mailers: { json: { provider: "json" } },
 * });
 *
 * // Callback style
 * await manager.send((m) => m.to("+1234567890").content("Hello!"));
 *
 * // Class style
 * await manager.send(new OtpWhatsApp("+1234567890", "123456"));
 *
 * // Specific mailer
 * await manager.use("twilio").send(new OtpWhatsApp("+1234567890", "123456"));
 * ```
 */
export class WhatsAppManager<TMailers extends Record<string, ProviderConfig>> {
	readonly #config: WhatsAppManagerConfig<TMailers>;
	readonly #logLevel: LogLevel;
	readonly #sendersCache = new Map<string, WhatsAppSender>();
	#fakeSender?: FakeSender;

	constructor(config: WhatsAppManagerConfig<TMailers>) {
		this.#config = config;
		this.#logLevel = config.logLevel ?? "info";
	}

	/**
	 * Send WhatsApp message using the default mailer.
	 * Accepts a compose callback or a BaseWhatsApp class instance.
	 */
	send(callbackOrWhatsApp: WhatsAppComposeCallback | BaseWhatsApp): Promise<WhatsAppResponse> {
		return this.use().send(callbackOrWhatsApp);
	}

	/**
	 * Get or create a cached sender for a specific mailer.
	 * When in fake mode, always returns the fake sender.
	 */
	use<K extends keyof TMailers & string>(mailerName?: K): WhatsAppSender {
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
		const sender = new WhatsAppSender(name, transport, this.#logLevel);
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
		console.log("[whatsapp]", ...args);
	}
}
