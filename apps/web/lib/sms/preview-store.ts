import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SMSPreview } from "./types";

const PREVIEW_DIR = join(process.cwd(), ".sms-previews");

function ensureDir() {
	if (!existsSync(PREVIEW_DIR)) {
		mkdirSync(PREVIEW_DIR, { recursive: true });
	}
}

export function writePreview(preview: SMSPreview): void {
	ensureDir();
	writeFileSync(join(PREVIEW_DIR, `${preview.id}.json`), JSON.stringify(preview, null, 2));
	writeFileSync(join(PREVIEW_DIR, `${preview.id}.html`), renderHtml(preview));
}

export function listPreviews(): SMSPreview[] {
	ensureDir();
	const files = readdirSync(PREVIEW_DIR).filter((f) => f.endsWith(".json"));
	return files
		.map((f) => {
			try {
				return JSON.parse(readFileSync(join(PREVIEW_DIR, f), "utf-8")) as SMSPreview;
			} catch {
				return null;
			}
		})
		.filter((p): p is SMSPreview => p !== null)
		.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}

export function getPreview(id: string): SMSPreview | null {
	const file = join(PREVIEW_DIR, `${id}.json`);
	if (!existsSync(file)) return null;
	try {
		return JSON.parse(readFileSync(file, "utf-8")) as SMSPreview;
	} catch {
		return null;
	}
}

function renderHtml(preview: SMSPreview): string {
	const { message, segmentInfo, sentAt, id } = preview;
	const time = new Date(sentAt).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SMS → ${escapeHtml(message.to)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif}
.phone{width:375px;min-height:600px;background:#fff;border-radius:44px;box-shadow:0 25px 60px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.06);overflow:hidden;display:flex;flex-direction:column}
.notch{height:36px;display:flex;align-items:center;justify-content:center;position:relative}
.notch::after{content:"";width:120px;height:6px;background:#1a1a1a;border-radius:3px;position:absolute;top:12px}
.header{background:#f8f8f8;padding:8px 16px 12px;border-bottom:1px solid #e5e5e5;text-align:center}
.header .name{font-size:17px;font-weight:600;color:#000}
.header .number{font-size:13px;color:#8e8e93;margin-top:2px}
.messages{flex:1;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;gap:4px}
.bubble{max-width:75%;padding:10px 14px;border-radius:18px;font-size:16px;line-height:1.35;word-break:break-word;background:#34c759;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.time{text-align:center;font-size:12px;color:#8e8e93;margin-bottom:8px}
.meta{background:#f8f8f8;border-top:1px solid #e5e5e5;padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#6b6b6b}
.meta-item{display:flex;flex-direction:column;gap:2px}
.meta-label{font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:.5px;color:#8e8e93}
.meta-value{font-family:"SF Mono",Menlo,monospace;font-size:12px;color:#333}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
.badge-gsm{background:#e8f5e9;color:#2e7d32}
.badge-ucs{background:#fff3e0;color:#e65100}
.id{grid-column:1/-1;font-family:"SF Mono",Menlo,monospace;font-size:10px;color:#aaa;word-break:break-all}
</style>
</head>
<body>
<div class="phone">
  <div class="notch"></div>
  <div class="header">
    <div class="name">${escapeHtml(message.to)}</div>
    ${message.from ? `<div class="number">from ${escapeHtml(message.from)}</div>` : ""}
  </div>
  <div class="messages">
    <div class="time">${escapeHtml(time)}</div>
    <div class="bubble">${escapeHtml(message.content)}</div>
  </div>
  <div class="meta">
    <div class="meta-item">
      <span class="meta-label">Encoding</span>
      <span class="meta-value"><span class="badge ${segmentInfo.encoding === "GSM-7" ? "badge-gsm" : "badge-ucs"}">${segmentInfo.encoding}</span></span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Segments</span>
      <span class="meta-value">${segmentInfo.segments} (${segmentInfo.characters} chars)</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Provider</span>
      <span class="meta-value">${escapeHtml(preview.response.provider)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Status</span>
      <span class="meta-value">${escapeHtml(preview.response.status)}</span>
    </div>
    <div class="id">${escapeHtml(id)}</div>
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
