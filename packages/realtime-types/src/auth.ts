import { z } from "zod";

export const authTokenPayloadSchema = z.object({
	userId: z.string(),
	userName: z.string(),
	sessionId: z.string(),
	exp: z.number(),
	iat: z.number(),
});

export type AuthTokenPayload = z.infer<typeof authTokenPayloadSchema>;
