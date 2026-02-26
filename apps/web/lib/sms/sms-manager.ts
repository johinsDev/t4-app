import type { BaseSms } from "./base-sms";
import { FakeSender } from "./fake-sender";
import { SMSSender } from "./sms-sender";
import { JsonTransport } from "./transports/json";
import { TwilioTransport } from "./transports/twilio";
import type {
	LogLevel,
	ProviderConfig,
	SMSComposeCallback,
	SMSManagerConfig,
	SMSResponse,
	SMSTransport,
} from "./types";

function createTransport(config: ProviderConfig): SMSTransport {
	switch (config.provider) {
		case "json":
			return new JsonTransport();
		case "twilio":
			return new TwilioTransport(config);
	}
}

/**
 * SMSManager manages multiple named senders (mailers), caches them,
 * and provides a simple API for sending SMS messages.
 *
 * ```ts
 * const manager = new SMSManager({
 *   default: "json",
 *   mailers: { json: { provider: "json" } },
 * });
 *
 * // Callback style
 * await manager.send((m) => m.to("+1234567890").content("Hello!"));
 *
 * // Class style
 * await manager.send(new OrderShippedSms("ORD-123", "+1234567890"));
 *
 * // Specific mailer
 * await manager.use("twilio").send(new OrderShippedSms("ORD-123", "+1234567890"));
 * ```
 */
export class SMSManager<TMailers extends Record<string, ProviderConfig>> {
	readonly #config: SMSManagerConfig<TMailers>;
	readonly #logLevel: LogLevel;
	readonly #sendersCache = new Map<string, SMSSender>();
	#fakeSender?: FakeSender;

	constructor(config: SMSManagerConfig<TMailers>) {
		this.#config = config;
		this.#logLevel = config.logLevel ?? "info";
	}

	/**
	 * Send SMS using the default mailer.
	 * Accepts a compose callback or a BaseSms class instance.
	 */
	send(callbackOrSms: SMSComposeCallback | BaseSms): Promise<SMSResponse> {
		return this.use().send(callbackOrSms);
	}

	/**
	 * Get or create a cached sender for a specific mailer.
	 * When in fake mode, always returns the fake sender.
	 */
	use<K extends keyof TMailers & string>(mailerName?: K): SMSSender {
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
		const sender = new SMSSender(name, transport, this.#logLevel);
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
		console.log("[sms]", ...args);
	}
}
