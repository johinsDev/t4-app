import { InvalidMessageError, InvalidPhoneNumberError } from "./errors";
import { e164PhoneSchema, whatsappContentSchema } from "./schemas";
import type { WhatsAppMessageData } from "./types";

const emojiMap: Record<string, string> = {
	check: "\u2705",
	lock: "\uD83D\uDD12",
	key: "\uD83D\uDD11",
	wave: "\uD83D\uDC4B",
	rocket: "\uD83D\uDE80",
	warning: "\u26A0\uFE0F",
	bell: "\uD83D\uDD14",
	star: "\u2B50",
	heart: "\u2764\uFE0F",
	fire: "\uD83D\uDD25",
	sparkles: "\u2728",
	shield: "\uD83D\uDEE1\uFE0F",
	clock: "\u23F0",
	package: "\uD83D\uDCE6",
	thumbsup: "\uD83D\uDC4D",
	tada: "\uD83C\uDF89",
};

export class WhatsAppMessage {
	#to?: string;
	#from?: string;
	#parts: string[] = [];
	#mediaUrl?: string;
	#contentSid?: string;
	#contentVariables?: Record<string, string>;

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
		this.#parts.push(text);
		return this;
	}

	bold(text: string): this {
		this.#parts.push(`*${text}*`);
		return this;
	}

	italic(text: string): this {
		this.#parts.push(`_${text}_`);
		return this;
	}

	boldItalic(text: string): this {
		this.#parts.push(`*_${text}_*`);
		return this;
	}

	strike(text: string): this {
		this.#parts.push(`~${text}~`);
		return this;
	}

	mono(text: string): this {
		this.#parts.push(`\`${text}\``);
		return this;
	}

	codeBlock(text: string): this {
		this.#parts.push(`\`\`\`${text}\`\`\``);
		return this;
	}

	line(): this {
		this.#parts.push("\n");
		return this;
	}

	/**
	 * Attach a media file (image, video, document, audio, sticker).
	 * The URL must be publicly accessible — Twilio fetches it when sending.
	 */
	media(url: string): this {
		this.#mediaUrl = url;
		return this;
	}

	/**
	 * Use a Twilio Content Template instead of freeform body.
	 * When set, the transport sends ContentSid + ContentVariables
	 * and ignores the freeform content parts.
	 */
	template(sid: string, variables?: Record<string, string>): this {
		this.#contentSid = sid;
		this.#contentVariables = variables;
		return this;
	}

	emoji(name: string): this {
		const char = emojiMap[name];
		if (!char) {
			throw new InvalidMessageError(
				`Unknown emoji name: "${name}". Available: ${Object.keys(emojiMap).join(", ")}`,
			);
		}
		this.#parts.push(char);
		return this;
	}

	toData(): WhatsAppMessageData {
		if (!this.#to) {
			throw new InvalidMessageError("Recipient (to) is required");
		}

		// Template mode: contentSid takes priority over freeform body
		if (this.#contentSid) {
			return {
				to: this.#to,
				...(this.#from && { from: this.#from }),
				content: this.#parts.length > 0 ? this.#parts.join("") : "[Content Template]",
				...(this.#mediaUrl && { mediaUrl: this.#mediaUrl }),
				contentSid: this.#contentSid,
				contentVariables: this.#contentVariables,
			};
		}

		const content = this.#parts.join("");
		if (!content && !this.#mediaUrl) {
			throw new InvalidMessageError("Content or media is required");
		}

		if (content) {
			const result = whatsappContentSchema.safeParse(content);
			if (!result.success) {
				throw new InvalidMessageError(result.error.issues[0]?.message ?? "Invalid content");
			}
		}

		return {
			to: this.#to,
			...(this.#from && { from: this.#from }),
			content,
			...(this.#mediaUrl && { mediaUrl: this.#mediaUrl }),
		};
	}
}
