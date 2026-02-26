import { exec } from "node:child_process";
import { writePreview } from "../preview-store";
import { smsSegmentInfo } from "../schemas";
import type { SMSMessageData, SMSPreview, SMSResponse, SMSTransport } from "../types";

export class JsonTransport implements SMSTransport {
	readonly name = "json";

	async send(message: SMSMessageData): Promise<SMSResponse> {
		const id = crypto.randomUUID();
		const response: SMSResponse = {
			status: "sent",
			providerMessageId: id,
			provider: this.name,
			timestamp: new Date().toISOString(),
		};

		const info = smsSegmentInfo(message.content);
		const preview: SMSPreview = {
			id,
			message,
			response,
			segmentInfo: {
				encoding: info.encoding,
				characters: info.characters,
				segments: info.segments,
			},
			sentAt: response.timestamp,
		};

		writePreview(preview);

		console.log(
			`\x1b[32m✉ SMS Preview\x1b[0m → .sms-previews/${id}.html | To: ${message.to} | ${info.segments} seg (${info.encoding})`,
		);

		if (process.env.NODE_ENV !== "production" && !process.env.CI) {
			const file = `${process.cwd()}/.sms-previews/${id}.html`;
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
