import type { BaseSms } from "./base-sms";
import { SMSSender } from "./sms-sender";
import type { SMSComposeCallback, SMSMessageData, SMSResponse, SMSTransport } from "./types";

const fakeTransport: SMSTransport = {
	name: "fake",
	async send(_data: SMSMessageData): Promise<SMSResponse> {
		return {
			status: "sent",
			provider: "fake",
			providerMessageId: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
		};
	},
};

/**
 * FakeSender captures all sent SMS messages for testing assertions.
 * Use via `smsManager.fake()` to intercept all sends.
 *
 * ```ts
 * const fake = smsManager.fake();
 * // ... code that sends SMS ...
 * fake.assertSent(OrderShippedSms);
 * fake.assertSentCount(1);
 * smsManager.restore();
 * ```
 */
export class FakeSender extends SMSSender {
	readonly sent: BaseSms[] = [];
	readonly sentMessages: SMSMessageData[] = [];

	constructor() {
		super("fake", fakeTransport, "silent");
	}

	/**
	 * Intercepts sends to capture BaseSms instances and message data
	 */
	async send(callbackOrSms: SMSComposeCallback | BaseSms): Promise<SMSResponse> {
		if (typeof callbackOrSms !== "function") {
			this.sent.push(callbackOrSms);
		}
		return super.send(callbackOrSms);
	}

	/**
	 * Intercepts compiled sends to capture raw message data
	 */
	async sendCompiled(data: SMSMessageData): Promise<SMSResponse> {
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
	assertSent<T extends new (...args: any[]) => BaseSms>(
		cls: T,
		findFn?: (sms: InstanceType<T>) => boolean,
	): this {
		const match = this.sent.find((sms) => {
			if (!(sms instanceof cls)) return false;
			return findFn ? findFn(sms as InstanceType<T>) : true;
		});
		if (!match) {
			throw new Error(`Expected "${cls.name}" to have been sent`);
		}
		return this;
	}

	// biome-ignore lint/suspicious/noExplicitAny: need any[] for constructors with typed args
	assertNotSent<T extends new (...args: any[]) => BaseSms>(
		cls: T,
		findFn?: (sms: InstanceType<T>) => boolean,
	): this {
		const match = this.sent.find((sms) => {
			if (!(sms instanceof cls)) return false;
			return findFn ? findFn(sms as InstanceType<T>) : true;
		});
		if (match) {
			throw new Error(`Unexpected "${cls.name}" was sent`);
		}
		return this;
	}

	assertSentCount(count: number): this;
	// biome-ignore lint/suspicious/noExplicitAny: need any[] for constructors with typed args
	assertSentCount(cls: new (...args: any[]) => BaseSms, count: number): this;
	// biome-ignore lint/suspicious/noExplicitAny: need any[] for constructors with typed args
	assertSentCount(clsOrCount: (new (...args: any[]) => BaseSms) | number, count?: number): this {
		if (typeof clsOrCount === "number") {
			if (this.sent.length !== clsOrCount) {
				throw new Error(`Expected ${clsOrCount} SMS to be sent, got ${this.sent.length}`);
			}
			return this;
		}
		const actual = this.sent.filter((sms) => sms instanceof clsOrCount).length;
		if (actual !== count) {
			throw new Error(`Expected "${clsOrCount.name}" to be sent ${count} times, got ${actual}`);
		}
		return this;
	}

	assertNoneSent(): this {
		if (this.sent.length > 0) {
			const names = this.sent.map((sms) => sms.constructor.name).join(", ");
			throw new Error(`Expected no SMS to be sent, but got: ${names}`);
		}
		return this;
	}
}
