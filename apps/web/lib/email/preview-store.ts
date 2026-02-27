import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EmailPreview, Recipient } from "./types";

const PREVIEW_DIR = join(process.cwd(), ".email-previews");

function ensureDir() {
	if (!existsSync(PREVIEW_DIR)) {
		mkdirSync(PREVIEW_DIR, { recursive: true });
	}
}

export function writePreview(preview: EmailPreview): void {
	ensureDir();
	writeFileSync(join(PREVIEW_DIR, `${preview.id}.json`), JSON.stringify(preview, null, 2));
	writeFileSync(join(PREVIEW_DIR, `${preview.id}.html`), renderHtml(preview));
}

export function listPreviews(): EmailPreview[] {
	ensureDir();
	const files = readdirSync(PREVIEW_DIR).filter((f) => f.endsWith(".json"));
	return files
		.map((f) => {
			try {
				return JSON.parse(readFileSync(join(PREVIEW_DIR, f), "utf-8")) as EmailPreview;
			} catch {
				return null;
			}
		})
		.filter((p): p is EmailPreview => p !== null)
		.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}

export function getPreview(id: string): EmailPreview | null {
	const file = join(PREVIEW_DIR, `${id}.json`);
	if (!existsSync(file)) return null;
	try {
		return JSON.parse(readFileSync(file, "utf-8")) as EmailPreview;
	} catch {
		return null;
	}
}

function formatRecipient(r: Recipient): string {
	if (typeof r === "string") return r;
	return r.name ? `${r.name} &lt;${escapeHtml(r.address)}&gt;` : escapeHtml(r.address);
}

function formatRecipients(recipients: Recipient[]): string {
	return recipients.map(formatRecipient).join(", ");
}

function renderHtml(preview: EmailPreview): string {
	const { message, sentAt, id } = preview;
	const time = new Date(sentAt).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});

	const fromDisplay = message.from ? formatRecipient(message.from) : "—";
	const toDisplay = formatRecipients(message.to);
	const ccDisplay = message.cc ? formatRecipients(message.cc) : null;
	const bccDisplay = message.bcc ? formatRecipients(message.bcc) : null;

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(message.subject)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif}
.envelope{max-width:800px;margin:0 auto;background:#fff;min-height:100vh;box-shadow:0 0 40px rgba(0,0,0,.08)}
.header{background:#f8f8f8;border-bottom:1px solid #e5e5e5;padding:20px 24px}
.header-row{display:flex;gap:8px;font-size:13px;line-height:1.6;color:#666}
.header-label{font-weight:600;color:#333;min-width:60px;text-align:right;flex-shrink:0}
.header-value{color:#333}
.subject-row{margin-top:12px;padding-top:12px;border-top:1px solid #e5e5e5}
.subject{font-size:18px;font-weight:600;color:#111}
.meta{display:flex;gap:16px;margin-top:8px;font-size:11px;color:#999}
.body-frame{width:100%;min-height:500px;border:none;display:block}
.body-text{padding:24px;font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap}
.footer{background:#f8f8f8;border-top:1px solid #e5e5e5;padding:12px 24px;font-size:11px;color:#999;display:flex;justify-content:space-between}
</style>
</head>
<body>
<div class="envelope">
  <div class="header">
    <div class="header-row">
      <span class="header-label">From:</span>
      <span class="header-value">${fromDisplay}</span>
    </div>
    <div class="header-row">
      <span class="header-label">To:</span>
      <span class="header-value">${toDisplay}</span>
    </div>
    ${ccDisplay ? `<div class="header-row"><span class="header-label">CC:</span><span class="header-value">${ccDisplay}</span></div>` : ""}
    ${bccDisplay ? `<div class="header-row"><span class="header-label">BCC:</span><span class="header-value">${bccDisplay}</span></div>` : ""}
    <div class="subject-row">
      <div class="subject">${escapeHtml(message.subject)}</div>
      <div class="meta">
        <span>${escapeHtml(time)}</span>
        <span>Provider: ${escapeHtml(preview.response.provider)}</span>
        <span>Status: ${escapeHtml(preview.response.status)}</span>
        ${message.priority ? `<span>Priority: ${escapeHtml(message.priority)}</span>` : ""}
        ${message.tags?.length ? `<span>Tags: ${message.tags.map((t) => `${escapeHtml(t.name)}=${escapeHtml(t.value)}`).join(", ")}</span>` : ""}
      </div>
    </div>
  </div>
  ${message.html ? `<iframe class="body-frame" srcdoc="${escapeAttr(message.html)}" sandbox="allow-same-origin"></iframe>` : `<div class="body-text">${escapeHtml(message.text ?? "")}</div>`}
  <div class="footer">
    <span>${escapeHtml(id)}</span>
    <span>${message.attachments?.length ? `${message.attachments.length} attachment(s)` : "No attachments"}</span>
  </div>
</div>
<script>
// Auto-resize iframe to content height
const frame = document.querySelector('.body-frame');
if (frame) {
  frame.addEventListener('load', () => {
    try {
      frame.style.height = frame.contentDocument.body.scrollHeight + 40 + 'px';
    } catch {}
  });
}
</script>
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

function escapeAttr(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
