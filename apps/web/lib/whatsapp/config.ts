import { env } from "@/env";
import type { ProviderConfig } from "./types";
import { WhatsAppManager } from "./whatsapp-manager";

const mailers: Record<string, ProviderConfig> = {
	json: { provider: "json" },
};

if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_NUMBER) {
	mailers.twilio = {
		provider: "twilio",
		accountSid: env.TWILIO_ACCOUNT_SID,
		authToken: env.TWILIO_AUTH_TOKEN,
		from: `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`,
	};
}

export const whatsappManager = new WhatsAppManager({
	default: env.WHATSAPP_PROVIDER,
	mailers,
});
