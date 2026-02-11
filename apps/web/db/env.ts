import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	DATABASE_AUTH_TOKEN: z.string().optional(),
});

export const dbEnv = envSchema.parse({
	DATABASE_URL: process.env.DATABASE_URL,
	DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
});
