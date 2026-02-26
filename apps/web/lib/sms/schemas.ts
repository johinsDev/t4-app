import { z } from "zod";

export const e164PhoneSchema = z
	.string()
	.regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +1234567890)");

export const smsContentSchema = z
	.string()
	.min(1, "SMS content cannot be empty")
	.max(1600, "SMS content cannot exceed 1600 characters");

const twilioProviderConfigSchema = z.object({
	provider: z.literal("twilio"),
	accountSid: z.string().min(1),
	authToken: z.string().min(1),
	from: e164PhoneSchema,
});

const jsonProviderConfigSchema = z.object({
	provider: z.literal("json"),
});

const providerConfigSchema = z.discriminatedUnion("provider", [
	twilioProviderConfigSchema,
	jsonProviderConfigSchema,
]);

const GSM7_CHARS =
	"@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
	"ÄÖÑÜabcdefghijklmnopqrstuvwxyz§äöñüà";
const GSM7_EXTENDED = "^{}\\[~]|€";
const GSM7_SET = new Set([...GSM7_CHARS, ...GSM7_EXTENDED]);

export function isGsm7(text: string): boolean {
	for (const char of text) {
		if (!GSM7_SET.has(char)) return false;
	}
	return true;
}

export interface SegmentInfo {
	encoding: "GSM-7" | "UCS-2";
	characters: number;
	segments: number;
	maxPerSegment: number;
}

export function smsSegmentInfo(text: string): SegmentInfo {
	const gsm7 = isGsm7(text);
	const encoding = gsm7 ? ("GSM-7" as const) : ("UCS-2" as const);

	let charCount: number;
	if (gsm7) {
		charCount = 0;
		for (const char of text) {
			charCount += GSM7_EXTENDED.includes(char) ? 2 : 1;
		}
	} else {
		charCount = text.length;
	}

	const singleMax = gsm7 ? 160 : 70;
	const concatMax = gsm7 ? 153 : 67;

	let segments: number;
	if (charCount <= singleMax) {
		segments = 1;
	} else {
		segments = Math.ceil(charCount / concatMax);
	}

	return {
		encoding,
		characters: charCount,
		segments,
		maxPerSegment: charCount <= singleMax ? singleMax : concatMax,
	};
}
