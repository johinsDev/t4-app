import { z } from "zod";

// Reuse E.164 phone validation from SMS library — no duplication
export { e164PhoneSchema } from "@/lib/sms";

export const whatsappContentSchema = z
	.string()
	.min(1, "WhatsApp content cannot be empty")
	.max(4096, "WhatsApp content cannot exceed 4096 characters");

/**
 * WhatsApp formatting helpers.
 * WhatsApp uses markdown-like syntax for rich text.
 */
export function bold(text: string): string {
	return `*${text}*`;
}

export function italic(text: string): string {
	return `_${text}_`;
}

export function boldItalic(text: string): string {
	return `*_${text}_*`;
}

export function strike(text: string): string {
	return `~${text}~`;
}

export function mono(text: string): string {
	return `\`${text}\``;
}

export function codeBlock(text: string): string {
	return `\`\`\`${text}\`\`\``;
}
