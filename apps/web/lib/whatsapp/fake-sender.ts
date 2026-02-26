import type { BaseWhatsApp } from "./base-whatsapp";
import type {
	WhatsAppComposeCallback,
	WhatsAppMessageData,
	WhatsAppResponse,
	WhatsAppTransport,
} from "./types";
import { WhatsAppSender } from "./whatsapp-sender";

const fakeTransport: WhatsAppTransport = {
	name: "fake",
	async send(_data: WhatsAppMessageData): Promise<WhatsAppResponse> {
		return {
			status: "sent",
			provider: "fake",
			providerMessageId: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
		};
	},
};

/**
 * FakeSender captures all sent WhatsApp messages for testing assertions.
 * Use via `whatsappManager.fake()` to intercept all sends.
 *
 * ```ts
 * const fake = whatsappManager.fake();
 * // ... code that sends WhatsApp messages ...
 * fake.assertSent(OtpWhatsApp);
 * fake.assertSentCount(1);
 * whatsappManager.restore();
 * ```
 */
export class FakeSender extends WhatsAppSender {
	readonly sent: BaseWhatsApp[] = [];
	readonly sentMessages: WhatsAppMessageData[] = [];

	constructor() {
		super("fake", fakeTransport, "silent");
	}

	/**
	 * Intercepts sends to capture BaseWhatsApp instances and message data
	 */
	async send(
		callbackOrWhatsApp: WhatsAppComposeCallback | BaseWhatsApp,
	): Promise<WhatsAppResponse> {
		if (typeof callbackOrWhatsApp !== "function") {
			this.sent.push(callbackOrWhatsApp);
		}
		return super.send(callbackOrWhatsApp);
	}

	/**
	 * Intercepts compiled sends to capture raw message data
	 */
	async sendCompiled(data: WhatsAppMessageData): Promise<WhatsAppResponse> {
		this.sentMessages.push(data);
		return super.sendCompiled(data);
	}

	/**
	 * Clear all captured messages
	 */
	clear(): void {
		this.sent.length = 0;
		this.sentMessages.length = 0;
	}

	// biome-ignore lint/suspicious/noExplicitAny: need any[] for constructors with typed args
	assertSent<T extends new (...args: any[]) => BaseWhatsApp>(
		cls: T,
		findFn?: (msg: InstanceType<T>) => boolean,
	): this {
		const match = this.sent.find((msg) => {
			if (!(msg instanceof cls)) return false;
			return findFn ? findFn(msg as InstanceType<T>) : true;
		});
		if (!match) {
			throw new Error(`Expected "${cls.name}" to have been sent`);
		}
		return this;
	}

	// biome-ignore lint/suspicious/noExplicitAny: need any[] for constructors with typed args
	assertNotSent<T extends new (...args: any[]) => BaseWhatsApp>(
		cls: T,
		findFn?: (msg: InstanceType<T>) => boolean,
	): this {
		const match = this.sent.find((msg) => {
			if (!(msg instanceof cls)) return false;
			return findFn ? findFn(msg as InstanceType<T>) : true;
		});
		if (match) {
			throw new Error(`Unexpected "${cls.name}" was sent`);
		}
		return this;
	}

	assertSentCount(count: number): this;
	// biome-ignore lint/suspicious/noExplicitAny: need any[] for constructors with typed args
	assertSentCount(cls: new (...args: any[]) => BaseWhatsApp, count: number): this;
	assertSentCount(
		// biome-ignore lint/suspicious/noExplicitAny: need any[] for constructors with typed args
		clsOrCount: (new (...args: any[]) => BaseWhatsApp) | number,
		count?: number,
	): this {
		if (typeof clsOrCount === "number") {
			if (this.sent.length !== clsOrCount) {
				throw new Error(
					`Expected ${clsOrCount} WhatsApp messages to be sent, got ${this.sent.length}`,
				);
			}
			return this;
		}
		const actual = this.sent.filter((msg) => msg instanceof clsOrCount).length;
		if (actual !== count) {
			throw new Error(`Expected "${clsOrCount.name}" to be sent ${count} times, got ${actual}`);
		}
		return this;
	}

	assertNoneSent(): this {
		if (this.sent.length > 0) {
			const names = this.sent.map((msg) => msg.constructor.name).join(", ");
			throw new Error(`Expected no WhatsApp messages to be sent, but got: ${names}`);
		}
		return this;
	}
}
