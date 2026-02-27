import { z } from "zod";

export const SEND_OTP_WHATSAPP = "send-otp-whatsapp" as const;

export const sendOtpWhatsAppSchema = z.object({
	to: z.string(),
	code: z.string(),
	appName: z.string(),
});
