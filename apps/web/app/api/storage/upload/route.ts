import { type NextRequest, NextResponse } from "next/server";
import { storageManager } from "@/lib/storage";

export async function PUT(request: NextRequest) {
	const token = request.nextUrl.searchParams.get("token");
	if (!token) {
		return NextResponse.json({ error: "Missing token" }, { status: 400 });
	}

	let payload: { key: string; disk?: string; exp: number };
	try {
		const decoded = Buffer.from(token, "base64url").toString("utf-8");
		payload = JSON.parse(decoded);
	} catch {
		return NextResponse.json({ error: "Invalid token" }, { status: 400 });
	}

	if (Date.now() > payload.exp) {
		return NextResponse.json({ error: "Token expired" }, { status: 403 });
	}

	try {
		const body = await request.arrayBuffer();
		const contentType = request.headers.get("content-type") ?? undefined;
		const disk = storageManager.use(payload.disk);

		await disk.put(payload.key, Buffer.from(body), { contentType });

		return NextResponse.json({ success: true, key: payload.key });
	} catch {
		return NextResponse.json({ error: "Upload failed" }, { status: 500 });
	}
}
