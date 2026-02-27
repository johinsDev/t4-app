import { env } from "@/env";
import { EmailManager } from "./email-manager";
import type { ProviderConfig } from "./types";

const mailers: Record<string, ProviderConfig> = {
	json: { provider: "json" },
};

if (env.RESEND_API_KEY) {
	mailers.resend = {
		provider: "resend",
		apiKey: env.RESEND_API_KEY,
	};
}

export const emailManager = new EmailManager({
	default: env.EMAIL_PROVIDER,
	mailers,
});
