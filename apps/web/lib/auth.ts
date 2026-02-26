import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber } from "better-auth/plugins";
import { db } from "@/db";
import { env } from "@/env";
import { whatsappManager } from "@/lib/whatsapp";

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
	plugins: [
		phoneNumber({
			sendOTP: async ({ phoneNumber: phone, code }) => {
				await whatsappManager.send((m) => {
					m.to(phone);

					m.emoji("lock")
						.content(" ")
						.bold(code)
						.content(` is your verification code for ${env.APP_NAME}.`)
						.line()
						.line()
						.italic("This code expires in 5 minutes.")
						.line()
						.content("Visit https://google.com to verify your account.");
				});
			},
			signUpOnVerification: {
				getTempEmail: (phone) => `${phone.replace(/\D/g, "")}@phone.internal`,
			},
		}),
		nextCookies(),
	],
});

export type Session = typeof auth.$Infer.Session;
