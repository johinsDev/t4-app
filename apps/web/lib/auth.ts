import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber } from "better-auth/plugins";
import { db } from "@/db";
import { env } from "@/env";
import { cacheManager } from "@/lib/cache";
import { sendOtpWhatsAppJob } from "@/trigger";

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	database: drizzleAdapter(db, { provider: "sqlite" }),
	secret: env.BETTER_AUTH_SECRET,
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	rateLimit: {
		enabled: true,
		window: 60,
		max: 10,
		customRules: {
			"/sign-in/*": { window: 10, max: 3 },
			"/sign-up/*": { window: 10, max: 3 },
			"/phone-number/send-otp": { window: 60, max: 3 },
			"/get-session": false,
		},
		customStorage: {
			get: async (key) => {
				const data = await cacheManager.get<{
					key: string;
					count: number;
					lastRequest: number;
				}>(`rl:${key}`);
				return data ?? null;
			},
			set: async (key, value) => {
				await cacheManager.set(`rl:${key}`, value, 120);
			},
		},
	},
	plugins: [
		phoneNumber({
			sendOTP: async ({ phoneNumber: phone, code }) => {
				await sendOtpWhatsAppJob({ to: phone, code, appName: env.APP_NAME });
			},
			signUpOnVerification: {
				getTempEmail: (phone) => `${phone.replace(/\D/g, "")}@phone.internal`,
			},
		}),
		nextCookies(),
	],
});

export type Session = typeof auth.$Infer.Session;
