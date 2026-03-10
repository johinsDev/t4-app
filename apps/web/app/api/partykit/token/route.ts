import { SignJWT } from "jose";
import { env } from "@/env";
import { getSession } from "@/lib/auth-server";

export async function GET() {
	const session = await getSession();
	if (!session?.user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const key = new TextEncoder().encode(env.PARTYKIT_JWT_SECRET);
	const token = await new SignJWT({
		userId: session.user.id,
		userName: session.user.name,
		sessionId: session.session.id,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("1h")
		.sign(key);

	return Response.json({ token, host: env.PARTYKIT_HOST });
}
