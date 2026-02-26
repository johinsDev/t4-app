import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WhatsAppPreview } from "./types";

const PREVIEW_DIR = join(process.cwd(), ".whatsapp-previews");

function ensureDir() {
	if (!existsSync(PREVIEW_DIR)) {
		mkdirSync(PREVIEW_DIR, { recursive: true });
	}
}

export function writePreview(preview: WhatsAppPreview): void {
	ensureDir();
	writeFileSync(join(PREVIEW_DIR, `${preview.id}.json`), JSON.stringify(preview, null, 2));
	writeFileSync(join(PREVIEW_DIR, `${preview.id}.html`), renderHtml(preview));
}

export function listPreviews(): WhatsAppPreview[] {
	ensureDir();
	const files = readdirSync(PREVIEW_DIR).filter((f) => f.endsWith(".json"));
	return files
		.map((f) => {
			try {
				return JSON.parse(readFileSync(join(PREVIEW_DIR, f), "utf-8")) as WhatsAppPreview;
			} catch {
				return null;
			}
		})
		.filter((p): p is WhatsAppPreview => p !== null)
		.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}

export function getPreview(id: string): WhatsAppPreview | null {
	const file = join(PREVIEW_DIR, `${id}.json`);
	if (!existsSync(file)) return null;
	try {
		return JSON.parse(readFileSync(file, "utf-8")) as WhatsAppPreview;
	} catch {
		return null;
	}
}

function renderMediaHtml(mediaUrl?: string): string {
	if (!mediaUrl) return "";
	const isImage = /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(mediaUrl);
	if (isImage) {
		return `<img class="bubble-media" src="${escapeHtml(mediaUrl)}" alt="media" />`;
	}
	return `<a class="bubble-media-link" href="${escapeHtml(mediaUrl)}" target="_blank">\uD83D\uDCCE ${escapeHtml(mediaUrl)}</a>`;
}

function renderWhatsAppContent(content: string): string {
	let html = escapeHtml(content);
	// Bold: *text*
	html = html.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
	// Italic: _text_
	html = html.replace(/_([^_]+)_/g, "<em>$1</em>");
	// Strikethrough: ~text~
	html = html.replace(/~([^~]+)~/g, "<del>$1</del>");
	// Monospace: `text`
	html = html.replace(
		/`([^`]+)`/g,
		'<code style="background:#2a2a2a;padding:1px 4px;border-radius:3px;font-size:14px">$1</code>',
	);
	// Newlines
	html = html.replace(/\n/g, "<br>");
	return html;
}

function renderHtml(preview: WhatsAppPreview): string {
	const { message, sentAt, id } = preview;
	const time = new Date(sentAt).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WhatsApp \u2192 ${escapeHtml(message.to)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#111b21;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif}
.phone{width:375px;min-height:600px;background:#0b141a;border-radius:44px;box-shadow:0 25px 60px rgba(0,0,0,.3),0 0 0 1px rgba(255,255,255,.06);overflow:hidden;display:flex;flex-direction:column}
.notch{height:36px;display:flex;align-items:center;justify-content:center;position:relative}
.notch::after{content:"";width:120px;height:6px;background:#1a1a1a;border-radius:3px;position:absolute;top:12px}
.header{background:#1f2c34;padding:8px 16px 12px;display:flex;align-items:center;gap:12px}
.avatar{width:40px;height:40px;border-radius:50%;background:#00a884;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;font-weight:600;flex-shrink:0}
.header-text{flex:1}
.header .name{font-size:16px;font-weight:500;color:#e9edef}
.header .number{font-size:13px;color:#8696a0;margin-top:1px}
.messages{flex:1;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;gap:4px;background:url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M30 5 L35 15 L30 12 L25 15Z' fill='%23ffffff' opacity='0.015'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='400' fill='%23080e13'/%3E%3Crect width='400' height='400' fill='url(%23p)'/%3E%3C/svg%3E")}
.time{text-align:center;font-size:12px;color:#8696a0;margin-bottom:8px;background:rgba(11,20,26,.8);display:inline-block;padding:4px 12px;border-radius:8px;align-self:center}
.bubble{max-width:80%;padding:8px 10px 6px;border-radius:8px;font-size:15px;line-height:1.4;word-break:break-word;background:#005c4b;color:#e9edef;align-self:flex-end;border-top-right-radius:2px;position:relative;overflow:hidden}
.bubble-media{margin:-8px -10px 6px;display:block;width:calc(100% + 20px);max-height:200px;object-fit:cover}
.bubble-media-link{display:block;margin:-8px -10px 6px;padding:8px 10px;background:#04453a;color:#53bdeb;font-size:13px;word-break:break-all;text-decoration:none}
.bubble-media-link:hover{text-decoration:underline}
.bubble-footer{display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:2px}
.bubble-time{font-size:11px;color:rgba(233,237,239,.6)}
.checks{display:inline-flex;color:#53bdeb}
.checks svg{width:16px;height:11px}
.meta{background:#1f2c34;border-top:1px solid #2a3942;padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#8696a0}
.meta-item{display:flex;flex-direction:column;gap:2px}
.meta-label{font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:.5px;color:#8696a0}
.meta-value{font-family:"SF Mono",Menlo,monospace;font-size:12px;color:#aebac1}
.id{grid-column:1/-1;font-family:"SF Mono",Menlo,monospace;font-size:10px;color:#667781;word-break:break-all}
</style>
</head>
<body>
<div class="phone">
  <div class="notch"></div>
  <div class="header">
    <div class="avatar">W</div>
    <div class="header-text">
      <div class="name">${escapeHtml(message.to)}</div>
      ${message.from ? `<div class="number">from ${escapeHtml(message.from)}</div>` : '<div class="number">online</div>'}
    </div>
  </div>
  <div class="messages">
    <div class="time">${escapeHtml(time)}</div>
    <div class="bubble">
      ${renderMediaHtml(message.mediaUrl)}
      ${message.content ? renderWhatsAppContent(message.content) : ""}
      <div class="bubble-footer">
        <span class="bubble-time">${escapeHtml(time)}</span>
        <span class="checks"><svg viewBox="0 0 16 11"><path d="M11.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 00-.336-.146.47.47 0 00-.343.146l-.311.31a.445.445 0 00-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 00.508.215.682.682 0 00.516-.238l6.738-8.303a.458.458 0 00.108-.336.403.403 0 00-.14-.298l-.456-.388z" fill="currentColor"/><path d="M14.757.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178l-6.19 7.636-1.2-1.134-.312.312 1.79 1.79a.724.724 0 00.508.215.682.682 0 00.516-.238l6.738-8.303a.458.458 0 00.108-.336.403.403 0 00-.14-.298l-.456-.388z" fill="currentColor" opacity=".75"/></svg></span>
      </div>
    </div>
  </div>
  <div class="meta">
    <div class="meta-item">
      <span class="meta-label">Provider</span>
      <span class="meta-value">${escapeHtml(preview.response.provider)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Status</span>
      <span class="meta-value">${escapeHtml(preview.response.status)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">${message.contentSid ? "Template" : "Characters"}</span>
      <span class="meta-value">${message.contentSid ? escapeHtml(message.contentSid) : `${message.content.length} / 4096`}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">${message.contentSid ? "Variables" : "Sent"}</span>
      <span class="meta-value">${message.contentSid && message.contentVariables ? escapeHtml(JSON.stringify(message.contentVariables)) : escapeHtml(new Date(sentAt).toLocaleString())}</span>
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
