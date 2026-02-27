import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { InvalidEmailError, InvalidMessageError } from "./errors";
import { emailAddressSchema, emailSubjectSchema } from "./schemas";
import type { EmailAttachment, EmailMessageData, Recipient } from "./types";

function normalizeRecipient(address: string, name?: string): Recipient {
	if (name) return { address, name };
	return address;
}

function validateEmail(email: string): string {
	const result = emailAddressSchema.safeParse(email);
	if (!result.success) {
		throw new InvalidEmailError(email);
	}
	return result.data;
}

function getAddress(recipient: Recipient): string {
	return typeof recipient === "string" ? recipient : recipient.address;
}

function getName(recipient: Recipient): string | undefined {
	return typeof recipient === "string" ? undefined : recipient.name;
}

export class EmailMessage {
	#to: Recipient[] = [];
	#from?: Recipient;
	#replyTo: Recipient[] = [];
	#cc: Recipient[] = [];
	#bcc: Recipient[] = [];
	#subject?: string;
	#html?: string;
	#text?: string;
	#attachments: EmailAttachment[] = [];
	#headers: Record<string, string> = {};
	#tags: Array<{ name: string; value: string }> = [];
	#priority?: "low" | "normal" | "high";

	// ── Recipients ──────────────────────────────────────

	to(address: string, name?: string): this {
		validateEmail(address);
		this.#to.push(normalizeRecipient(address, name));
		return this;
	}

	cc(address: string, name?: string): this;
	cc(addresses: Array<string | { address: string; name?: string }>): this;
	cc(
		addressOrArray: string | Array<string | { address: string; name?: string }>,
		name?: string,
	): this {
		if (Array.isArray(addressOrArray)) {
			for (const entry of addressOrArray) {
				if (typeof entry === "string") {
					validateEmail(entry);
					this.#cc.push(entry);
				} else {
					validateEmail(entry.address);
					this.#cc.push(entry);
				}
			}
			return this;
		}
		validateEmail(addressOrArray);
		this.#cc.push(normalizeRecipient(addressOrArray, name));
		return this;
	}

	bcc(address: string, name?: string): this;
	bcc(addresses: Array<string | { address: string; name?: string }>): this;
	bcc(
		addressOrArray: string | Array<string | { address: string; name?: string }>,
		name?: string,
	): this {
		if (Array.isArray(addressOrArray)) {
			for (const entry of addressOrArray) {
				if (typeof entry === "string") {
					validateEmail(entry);
					this.#bcc.push(entry);
				} else {
					validateEmail(entry.address);
					this.#bcc.push(entry);
				}
			}
			return this;
		}
		validateEmail(addressOrArray);
		this.#bcc.push(normalizeRecipient(addressOrArray, name));
		return this;
	}

	from(address: string, name?: string): this {
		validateEmail(address);
		this.#from = normalizeRecipient(address, name);
		return this;
	}

	replyTo(address: string, name?: string): this {
		validateEmail(address);
		this.#replyTo.push(normalizeRecipient(address, name));
		return this;
	}

	// ── Content ─────────────────────────────────────────

	subject(text: string): this {
		const result = emailSubjectSchema.safeParse(text);
		if (!result.success) {
			throw new InvalidMessageError(result.error.issues[0]?.message ?? "Invalid subject");
		}
		this.#subject = result.data;
		return this;
	}

	html(content: string): this {
		this.#html = content;
		return this;
	}

	text(content: string): this {
		this.#text = content;
		return this;
	}

	// ── Attachments ─────────────────────────────────────

	attach(filePath: string, options?: { filename?: string; contentType?: string }): this {
		const content = readFileSync(filePath);
		this.#attachments.push({
			filename: options?.filename ?? basename(filePath),
			content: content,
			contentType: options?.contentType,
		});
		return this;
	}

	attachData(content: string | Buffer, options: { filename: string; contentType?: string }): this {
		this.#attachments.push({
			filename: options.filename,
			content,
			contentType: options.contentType,
		});
		return this;
	}

	embed(filePath: string, cid: string, options?: { contentType?: string }): this {
		const content = readFileSync(filePath);
		this.#attachments.push({
			filename: basename(filePath),
			content,
			contentType: options?.contentType,
		});
		this.#headers[`X-Embed-CID-${cid}`] = basename(filePath);
		return this;
	}

	embedData(
		content: string | Buffer,
		cid: string,
		options?: { filename?: string; contentType?: string },
	): this {
		const filename = options?.filename ?? `embed-${cid}`;
		this.#attachments.push({
			filename,
			content,
			contentType: options?.contentType,
		});
		this.#headers[`X-Embed-CID-${cid}`] = filename;
		return this;
	}

	// ── Metadata & Headers ──────────────────────────────

	header(key: string, value: string): this {
		this.#headers[key] = value;
		return this;
	}

	priority(level: "low" | "normal" | "high"): this {
		this.#priority = level;
		return this;
	}

	tag(name: string, value: string): this {
		this.#tags.push({ name, value });
		return this;
	}

	listUnsubscribe(url: string): this {
		this.#headers["List-Unsubscribe"] = `<${url}>`;
		return this;
	}

	// ── Testing assertions ──────────────────────────────

	hasTo(address: string, name?: string): boolean {
		return this.#to.some((r) => {
			if (getAddress(r) !== address) return false;
			if (name !== undefined && getName(r) !== name) return false;
			return true;
		});
	}

	hasFrom(address: string, name?: string): boolean {
		if (!this.#from) return false;
		if (getAddress(this.#from) !== address) return false;
		if (name !== undefined && getName(this.#from) !== name) return false;
		return true;
	}

	hasCc(address: string): boolean {
		return this.#cc.some((r) => getAddress(r) === address);
	}

	hasBcc(address: string): boolean {
		return this.#bcc.some((r) => getAddress(r) === address);
	}

	hasReplyTo(address: string): boolean {
		return this.#replyTo.some((r) => getAddress(r) === address);
	}

	hasSubject(text: string): boolean {
		return this.#subject === text;
	}

	hasAttachment(file: string): boolean;
	hasAttachment(finder: (attachment: EmailAttachment) => boolean): boolean;
	hasAttachment(fileOrFinder: string | ((attachment: EmailAttachment) => boolean)): boolean {
		if (typeof fileOrFinder === "function") {
			return this.#attachments.some(fileOrFinder);
		}
		return this.#attachments.some((a) => a.filename === fileOrFinder);
	}

	assertTo(address: string, name?: string): void {
		if (!this.hasTo(address, name)) {
			throw new Error(
				`AssertionError: Expected recipient "${name ? `${name} <${address}>` : address}" not found`,
			);
		}
	}

	assertFrom(address: string, name?: string): void {
		if (!this.hasFrom(address, name)) {
			throw new Error(
				`AssertionError: Expected sender "${name ? `${name} <${address}>` : address}" not found`,
			);
		}
	}

	assertSubject(text: string): void {
		if (this.#subject !== text) {
			throw new Error(
				`AssertionError: Expected subject "${text}", got "${this.#subject ?? "(none)"}"`,
			);
		}
	}

	assertHtmlIncludes(pattern: string | RegExp): void {
		if (!this.#html) {
			throw new Error("AssertionError: No HTML content set");
		}
		const matches =
			typeof pattern === "string" ? this.#html.includes(pattern) : pattern.test(this.#html);
		if (!matches) {
			throw new Error(`AssertionError: HTML does not match pattern ${pattern}`);
		}
	}

	assertTextIncludes(pattern: string | RegExp): void {
		if (!this.#text) {
			throw new Error("AssertionError: No text content set");
		}
		const matches =
			typeof pattern === "string" ? this.#text.includes(pattern) : pattern.test(this.#text);
		if (!matches) {
			throw new Error(`AssertionError: Text does not match pattern ${pattern}`);
		}
	}

	// ── Output ──────────────────────────────────────────

	toData(): EmailMessageData {
		if (this.#to.length === 0) {
			throw new InvalidMessageError("At least one recipient (to) is required");
		}
		if (!this.#subject) {
			throw new InvalidMessageError("Subject is required");
		}
		if (!this.#html && !this.#text) {
			throw new InvalidMessageError("Either html or text content is required");
		}

		const data: EmailMessageData = {
			to: this.#to,
			subject: this.#subject,
		};

		if (this.#from) data.from = this.#from;
		if (this.#replyTo.length > 0) data.replyTo = this.#replyTo;
		if (this.#cc.length > 0) data.cc = this.#cc;
		if (this.#bcc.length > 0) data.bcc = this.#bcc;
		if (this.#html) data.html = this.#html;
		if (this.#text) data.text = this.#text;
		if (this.#attachments.length > 0) data.attachments = this.#attachments;
		if (Object.keys(this.#headers).length > 0) data.headers = this.#headers;
		if (this.#tags.length > 0) data.tags = this.#tags;
		if (this.#priority) data.priority = this.#priority;

		return data;
	}
}
