import { type TriggerOptions, tasks } from "@trigger.dev/sdk/v3";
import type { z } from "zod";
import { SEND_OTP_WHATSAPP, type sendOtpWhatsAppSchema } from "./constants";
import type { sendOtpWhatsAppTask } from "./tasks/send-whatsapp";

export async function sendOtpWhatsAppJob(
	payload: z.infer<typeof sendOtpWhatsAppSchema>,
	options?: TriggerOptions,
) {
	return tasks.trigger<typeof sendOtpWhatsAppTask>(SEND_OTP_WHATSAPP, payload, options);
}
