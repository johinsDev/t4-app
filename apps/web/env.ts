import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const smsProvider = z.enum(["json", "twilio"]).default("json");
const whatsappProvider = z.enum(["json", "twilio"]).default("json");
const emailProvider = z.enum(["json", "resend"]).default("json");

const cacheProvider = z.enum(["memory", "upstash", "redis"]).default("memory");
const rateLimitProvider = z.enum(["memory", "upstash"]).default("memory");

const upstashRequired = (field: string) =>
	z
		.string()
		.optional()
		.refine(
			(val) =>
				(process.env.CACHE_PROVIDER !== "upstash" &&
					process.env.RATE_LIMIT_PROVIDER !== "upstash") ||
				(val && val.length > 0),
			{
				message: `${field} is required when CACHE_PROVIDER=upstash or RATE_LIMIT_PROVIDER=upstash`,
			},
		);

const redisRequired = (field: string) =>
	z
		.string()
		.optional()
		.refine((val) => process.env.CACHE_PROVIDER !== "redis" || (val && val.length > 0), {
			message: `${field} is required when CACHE_PROVIDER=redis`,
		});

const resendRequired = (field: string) =>
	z
		.string()
		.optional()
		.refine((val) => process.env.EMAIL_PROVIDER !== "resend" || (val && val.length > 0), {
			message: `${field} is required when EMAIL_PROVIDER=resend`,
		});

const twilioRequired = (field: string) =>
	z
		.string()
		.optional()
		.refine((val) => process.env.SMS_PROVIDER !== "twilio" || (val && val.length > 0), {
			message: `${field} is required when SMS_PROVIDER=twilio`,
		});

const twilioWhatsAppRequired = (field: string) =>
	z
		.string()
		.optional()
		.refine((val) => process.env.WHATSAPP_PROVIDER !== "twilio" || (val && val.length > 0), {
			message: `${field} is required when WHATSAPP_PROVIDER=twilio`,
		});

export const env = createEnv({
	server: {
		APP_NAME: z.string().min(1),
		DATABASE_URL: z.string().min(1),
		DATABASE_AUTH_TOKEN: z.string().optional(),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url().optional(),
		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
		SMS_PROVIDER: smsProvider,
		TWILIO_ACCOUNT_SID: twilioRequired("TWILIO_ACCOUNT_SID"),
		TWILIO_AUTH_TOKEN: twilioRequired("TWILIO_AUTH_TOKEN"),
		TWILIO_PHONE_NUMBER: twilioRequired("TWILIO_PHONE_NUMBER"),
		WHATSAPP_PROVIDER: whatsappProvider,
		TWILIO_WHATSAPP_NUMBER: twilioWhatsAppRequired("TWILIO_WHATSAPP_NUMBER"),
		EMAIL_PROVIDER: emailProvider,
		RESEND_API_KEY: resendRequired("RESEND_API_KEY"),
		EMAIL_FROM: z.string().default("onboarding@resend.dev"),
		CACHE_PROVIDER: cacheProvider,
		RATE_LIMIT_PROVIDER: rateLimitProvider,
		UPSTASH_REDIS_REST_URL: upstashRequired("UPSTASH_REDIS_REST_URL"),
		UPSTASH_REDIS_REST_TOKEN: upstashRequired("UPSTASH_REDIS_REST_TOKEN"),
		REDIS_URL: redisRequired("REDIS_URL"),
		TRIGGER_SECRET_KEY: z.string().optional(),
	},
	experimental__runtimeEnv: process.env,
});
