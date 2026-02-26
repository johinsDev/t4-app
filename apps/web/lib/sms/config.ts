import { env } from "@/env";
import { SMSManager } from "./sms-manager";
import type { ProviderConfig } from "./types";

const mailers: Record<string, ProviderConfig> = {
	json: { provider: "json" },
};

if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
	mailers.twilio = {
		provider: "twilio",
		accountSid: env.TWILIO_ACCOUNT_SID,
		authToken: env.TWILIO_AUTH_TOKEN,
		from: env.TWILIO_PHONE_NUMBER,
	};
}

export const smsManager = new SMSManager({
	default: env.SMS_PROVIDER,
	mailers,
});
