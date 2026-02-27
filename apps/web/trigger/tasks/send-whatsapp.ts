import { schemaTask } from "@trigger.dev/sdk/v3";
import { whatsappManager } from "@/lib/whatsapp";
import { SEND_OTP_WHATSAPP, sendOtpWhatsAppSchema } from "../constants";

export const sendOtpWhatsAppTask = schemaTask({
	id: SEND_OTP_WHATSAPP,
	schema: sendOtpWhatsAppSchema,
	run: async (payload) => {
		await whatsappManager.send((msg) => {
			msg.to(payload.to);

			msg
				.emoji("lock")
				.content(" ")
				.bold(payload.code)
				.content(` is your verification code for ${payload.appName}.`)
				.line()
				.line()
				.italic("This code expires in 5 minutes.");
		});
	},
});
