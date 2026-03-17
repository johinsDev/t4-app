import { type NextRequest, NextResponse } from "next/server";
import { storageManager } from "@/lib/storage";

const contentTypes: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	pdf: "application/pdf",
	json: "application/json",
	mp4: "video/mp4",
	mp3: "audio/mpeg",
	css: "text/css",
	js: "text/javascript",
};

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ key: string[] }> },
) {
	const { key: segments } = await params;
	const key = segments.join("/");

	const disk = request.nextUrl.searchParams.get("disk");

	try {
		const storage = storageManager.use(disk ?? undefined);

		if (!storage.isPublic) {
			return NextResponse.json({ error: "Disk is not public" }, { status: 403 });
		}

		const file = await storage.get(key);

		if (!file) {
			return NextResponse.json({ error: "File not found" }, { status: 404 });
		}

		const ext = key.split(".").pop()?.toLowerCase();

		return new NextResponse(new Uint8Array(file.body), {
			headers: {
				"Content-Type": file.contentType ?? contentTypes[ext ?? ""] ?? "application/octet-stream",
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		});
	} catch {
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
