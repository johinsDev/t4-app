import { exec } from "node:child_process";
import { writePreview } from "../preview-store";
import type { EmailMessageData, EmailPreview, EmailResponse, EmailTransport } from "../types";

export class JsonTransport implements EmailTransport {
	readonly name = "json";

	async send(message: EmailMessageData): Promise<EmailResponse> {
		const id = crypto.randomUUID();
		const response: EmailResponse = {
			status: "sent",
			providerMessageId: id,
			provider: this.name,
			timestamp: new Date().toISOString(),
		};

		const preview: EmailPreview = {
			id,
			message,
			response,
			sentAt: response.timestamp,
		};

		writePreview(preview);

		const toAddrs = message.to.map((r) => (typeof r === "string" ? r : r.address)).join(", ");
		console.log(
			`\x1b[35m\u2709 Email Preview\x1b[0m \u2192 .email-previews/${id}.html | To: ${toAddrs} | Subject: ${message.subject}`,
		);

		if (process.env.NODE_ENV !== "production" && !process.env.CI) {
			const file = `${process.cwd()}/.email-previews/${id}.html`;
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
