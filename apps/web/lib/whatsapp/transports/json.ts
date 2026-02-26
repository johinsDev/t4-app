import { exec } from "node:child_process";
import { writePreview } from "../preview-store";
import type {
	WhatsAppMessageData,
	WhatsAppPreview,
	WhatsAppResponse,
	WhatsAppTransport,
} from "../types";

export class JsonTransport implements WhatsAppTransport {
	readonly name = "json";

	async send(message: WhatsAppMessageData): Promise<WhatsAppResponse> {
		const id = crypto.randomUUID();
		const response: WhatsAppResponse = {
			status: "sent",
			providerMessageId: id,
			provider: this.name,
			timestamp: new Date().toISOString(),
		};

		const preview: WhatsAppPreview = {
			id,
			message,
			response,
			sentAt: response.timestamp,
		};

		writePreview(preview);

		const extra = [
			message.contentSid && `Template: ${message.contentSid}`,
			message.mediaUrl && `Media: ${message.mediaUrl}`,
		]
			.filter(Boolean)
			.join(" | ");
		console.log(
			`\x1b[32m\uD83D\uDCAC WhatsApp Preview\x1b[0m \u2192 .whatsapp-previews/${id}.html | To: ${message.to}${extra ? ` | ${extra}` : ""}`,
		);

		if (process.env.NODE_ENV !== "production" && !process.env.CI) {
			const file = `${process.cwd()}/.whatsapp-previews/${id}.html`;
			const cmd =
				process.platform === "darwin"
					? "open"
					: process.platform === "win32"
						? "start"
						: "xdg-open";
			exec(`${cmd} "${file}"`, () => {});
		}

		return response;
	}
}
