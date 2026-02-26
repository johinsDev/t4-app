import { InvalidMessageError, InvalidPhoneNumberError } from "./errors";
import { e164PhoneSchema, type SegmentInfo, smsContentSchema, smsSegmentInfo } from "./schemas";
import type { SMSMessageData } from "./types";

export class SMSMessage {
	#to?: string;
	#from?: string;
	#content?: string;

	to(phone: string): this {
		const result = e164PhoneSchema.safeParse(phone);
		if (!result.success) {
			throw new InvalidPhoneNumberError(phone);
		}
		this.#to = result.data;
		return this;
	}

	from(phone: string): this {
		const result = e164PhoneSchema.safeParse(phone);
		if (!result.success) {
			throw new InvalidPhoneNumberError(phone);
		}
		this.#from = result.data;
		return this;
	}

	content(text: string): this {
		const result = smsContentSchema.safeParse(text);
		if (!result.success) {
			throw new InvalidMessageError(result.error.issues[0]?.message ?? "Invalid content");
		}
		this.#content = result.data;
		return this;
	}

	get segmentInfo(): SegmentInfo | null {
		if (!this.#content) return null;
		return smsSegmentInfo(this.#content);
	}

	toData(): SMSMessageData {
		if (!this.#to) {
			throw new InvalidMessageError("Recipient (to) is required");
		}
		if (!this.#content) {
			throw new InvalidMessageError("Content is required");
		}
		return {
			to: this.#to,
			...(this.#from && { from: this.#from }),
			content: this.#content,
		};
	}
}
