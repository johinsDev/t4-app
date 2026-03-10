import { type AuthTokenPayload, authTokenPayloadSchema } from "@repo/realtime-types";
import { jwtVerify } from "jose";

export async function verifyToken(token: string, secret: string): Promise<AuthTokenPayload> {
	const key = new TextEncoder().encode(secret);
	const { payload } = await jwtVerify(token, key);
	return authTokenPayloadSchema.parse(payload);
}

export function extractTokenFromUrl(url: string): string | null {
	return new URL(url).searchParams.get("token");
}
