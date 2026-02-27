import type { CreateEmailOptions } from "resend";
import { ProviderError, RateLimitError } from "../errors";
import type {
	EmailMessageData,
	EmailResponse,
	EmailTransport,
	Recipient,
	ResendProviderConfig,
} from "../types";

function formatRecipient(r: Recipient): string {
	if (typeof r === "string") return r;
	return r.name ? `${r.name} <${r.address}>` : r.address;
}

export class ResendTransport implements EmailTransport {
	readonly name = "resend";
	readonly #config: ResendProviderConfig;
	#client: unknown;

	constructor(config: ResendProviderConfig) {
		this.#config = config;
	}

	async #getClient() {
		if (!this.#client) {
			const { Resend } = await import("resend");
			this.#client = new Resend(this.#config.apiKey);
		}
		return this.#client as import("resend").Resend;
	}

	async send(message: EmailMessageData): Promise<EmailResponse> {
		const client = await this.#getClient();

		const headers: Record<string, string> = { ...message.headers };
		if (message.priority) {
			const priorityMap = { low: "5", normal: "3", high: "1" };
			headers["X-Priority"] = priorityMap[message.priority];
		}

		// Build payload with explicit content field to satisfy RequireAtLeastOne<EmailRenderOptions>
		const payload: CreateEmailOptions = {
			from: message.from ? formatRecipient(message.from) : "onboarding@resend.dev",
			to: message.to.map(formatRecipient),
			subject: message.subject,
			html: message.html ?? "",
			...(message.text && { text: message.text }),
			...(message.cc && { cc: message.cc.map(formatRecipient) }),
			...(message.bcc && { bcc: message.bcc.map(formatRecipient) }),
			...(message.replyTo && { replyTo: message.replyTo.map(formatRecipient) }),
			...(message.attachments && {
				attachments: message.attachments.map((a) => ({
					filename: a.filename,
					content: a.content instanceof Buffer ? a.content : Buffer.from(a.content),
				})),
			}),
			...(Object.keys(headers).length > 0 && { headers }),
			...(message.tags && { tags: message.tags }),
		};

		try {
			const result = await client.emails.send(payload);

			if (result.error) {
				throw new ProviderError(this.name, result.error.message);
			}

			return {
				status: "sent",
				providerMessageId: result.data?.id,
				provider: this.name,
				timestamp: new Date().toISOString(),
			};
		} catch (error: unknown) {
			if (error instanceof ProviderError || error instanceof RateLimitError) {
				throw error;
			}

			if (error && typeof error === "object" && "statusCode" in error) {
				const resendError = error as { statusCode: number; message: string; name: string };
				if (resendError.statusCode === 429) {
					throw new RateLimitError(60_000);
				}
				throw new ProviderError(this.name, resendError.message, String(resendError.statusCode));
			}
			throw new ProviderError(this.name, error instanceof Error ? error.message : "Unknown error");
		}
	}
}
