import type { BaseMail } from "./base-mail";
import { EmailSender } from "./email-sender";
import type {
	EmailComposeCallback,
	EmailMessageData,
	EmailResponse,
	EmailTransport,
} from "./types";

const fakeTransport: EmailTransport = {
	name: "fake",
	async send(_data: EmailMessageData): Promise<EmailResponse> {
		return {
			status: "sent",
			provider: "fake",
			providerMessageId: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
		};
	},
};

/**
 * FakeSender captures all sent email messages for testing assertions.
 * Use via `emailManager.fake()` to intercept all sends.
 *
 * ```ts
 * const fake = emailManager.fake();
 * // ... code that sends email ...
 * fake.assertSent(WelcomeMail);
 * fake.assertSentCount(1);
 * emailManager.restore();
 * ```
 */
export class FakeSender extends EmailSender {
	readonly sent: BaseMail[] = [];
	readonly sentMessages: EmailMessageData[] = [];

	constructor() {
		super("fake", fakeTransport, "silent");
	}

	/**
	 * Intercepts sends to capture BaseMail instances and message data
	 */
	async send(callbackOrMail: EmailComposeCallback | BaseMail): Promise<EmailResponse> {
		if (typeof callbackOrMail !== "function") {
			this.sent.push(callbackOrMail);
		}
		return super.send(callbackOrMail);
	}

	/**
	 * Intercepts compiled sends to capture raw message data
	 */
	async sendCompiled(data: EmailMessageData): Promise<EmailResponse> {
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
	assertSent<T extends new (...args: any[]) => BaseMail>(
		cls: T,
		findFn?: (mail: InstanceType<T>) => boolean,
	): this {
		const match = this.sent.find((mail) => {
			if (!(mail instanceof cls)) return false;
			return findFn ? findFn(mail as InstanceType<T>) : true;
		});
		if (!match) {
			throw new Error(`Expected "${cls.name}" to have been sent`);
		}
		return this;
	}

	// biome-ignore lint/suspicious/noExplicitAny: need any[] for constructors with typed args
	assertNotSent<T extends new (...args: any[]) => BaseMail>(
		cls: T,
		findFn?: (mail: InstanceType<T>) => boolean,
	): this {
		const match = this.sent.find((mail) => {
			if (!(mail instanceof cls)) return false;
			return findFn ? findFn(mail as InstanceType<T>) : true;
		});
		if (match) {
			throw new Error(`Unexpected "${cls.name}" was sent`);
		}
		return this;
	}

	assertSentCount(count: number): this;
	// biome-ignore lint/suspicious/noExplicitAny: need any[] for constructors with typed args
	assertSentCount(cls: new (...args: any[]) => BaseMail, count: number): this;
	// biome-ignore lint/suspicious/noExplicitAny: need any[] for constructors with typed args
	assertSentCount(clsOrCount: (new (...args: any[]) => BaseMail) | number, count?: number): this {
		if (typeof clsOrCount === "number") {
			if (this.sent.length !== clsOrCount) {
				throw new Error(`Expected ${clsOrCount} emails to be sent, got ${this.sent.length}`);
			}
			return this;
		}
		const actual = this.sent.filter((mail) => mail instanceof clsOrCount).length;
		if (actual !== count) {
			throw new Error(`Expected "${clsOrCount.name}" to be sent ${count} times, got ${actual}`);
		}
		return this;
	}

	assertNoneSent(): this {
		if (this.sent.length > 0) {
			const names = this.sent.map((mail) => mail.constructor.name).join(", ");
			throw new Error(`Expected no emails to be sent, but got: ${names}`);
		}
		return this;
	}
}
