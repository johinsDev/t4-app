import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber } from "better-auth/plugins";
import { db } from "@/db";
import { env } from "@/env";
import { smsManager } from "@/lib/sms";

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
				await smsManager.send((m) => {
					m.to(phone).content(`Your code is: ${code} to verify your account on ${env.APP_NAME}`);
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
