import { type NextRequest, NextResponse } from "next/server";
import { storageManager } from "@/lib/storage";

export async function GET(request: NextRequest) {
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
		const disk = storageManager.use(payload.disk);
		const file = await disk.get(payload.key);

		if (!file) {
			return NextResponse.json({ error: "File not found" }, { status: 404 });
		}

		const ext = payload.key.split(".").pop()?.toLowerCase();
		const contentTypes: Record<string, string> = {
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			gif: "image/gif",
			webp: "image/webp",
			svg: "image/svg+xml",
			pdf: "application/pdf",
			json: "application/json",
		};

		return new NextResponse(new Uint8Array(file.body), {
			headers: {
				"Content-Type": file.contentType ?? contentTypes[ext ?? ""] ?? "application/octet-stream",
				"Cache-Control": "private, max-age=3600",
			},
		});
	} catch {
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
