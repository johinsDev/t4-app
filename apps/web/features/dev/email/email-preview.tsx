import type { Recipient } from "@/lib/email";

interface PreviewData {
	id: string;
	sentAt: string;
	message: {
		subject: string;
		to: Recipient[];
		from?: Recipient;
		html?: string;
		text?: string;
	};
	response: {
		provider: string;
		status: string;
	};
}

function formatRecipient(r: Recipient): string {
	if (typeof r === "string") return r;
	return r.name ? `${r.name} <${r.address}>` : r.address;
}

function getInitial(r: Recipient): string {
	if (typeof r === "string") return r[0]?.toUpperCase() ?? "?";
	return (r.name?.[0] ?? r.address[0])?.toUpperCase() ?? "?";
}

export function EmailPreviewCard({ preview }: { preview: PreviewData }) {
	const time = new Date(preview.sentAt).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
	const date = new Date(preview.sentAt).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});

	const toDisplay = preview.message.to.map(formatRecipient).join(", ");
	const fromDisplay = preview.message.from ? formatRecipient(preview.message.from) : "—";
	const fromInitial = preview.message.from ? getInitial(preview.message.from) : "?";

	return (
		<div className="w-[380px] shrink-0">
			<div className="flex min-h-[460px] flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
				{/* Window chrome */}
				<div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-2.5 dark:bg-zinc-800/80">
					<div className="flex gap-1.5">
						<div className="size-2.5 rounded-full bg-red-400" />
						<div className="size-2.5 rounded-full bg-yellow-400" />
						<div className="size-2.5 rounded-full bg-green-400" />
					</div>
					<span className="text-muted-foreground flex-1 text-center text-[10px] font-medium tracking-wide">
						{preview.response.provider}
					</span>
					<div className="w-[42px]" />
				</div>

				{/* Email header */}
				<div className="space-y-3 border-b px-4 py-3.5">
					<div className="flex items-start gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
							{fromInitial}
						</div>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-semibold leading-tight">
								{preview.message.subject}
							</p>
							<p className="text-muted-foreground mt-0.5 truncate text-[11px]">{fromDisplay}</p>
						</div>
						<span className="text-muted-foreground shrink-0 text-[11px]">
							{date}
							<br />
							{time}
						</span>
					</div>
					<p className="text-muted-foreground truncate text-[11px]">
						<span className="font-medium">To:</span> {toDisplay}
					</p>
				</div>

				{/* Body preview */}
				<div className="flex-1 overflow-hidden">
					{preview.message.html ? (
						<iframe
							srcDoc={preview.message.html}
							sandbox="allow-same-origin"
							className="h-full min-h-[240px] w-full border-none"
							title="Email preview"
						/>
					) : (
						<div className="text-muted-foreground p-4 text-sm whitespace-pre-wrap">
							{preview.message.text ?? "No content"}
						</div>
					)}
				</div>

				{/* Status bar */}
				<div className="flex items-center justify-between border-t bg-gray-50 px-4 py-2 dark:bg-zinc-800/50">
					<div className="flex items-center gap-1.5">
						<span className="size-1.5 rounded-full bg-emerald-500" />
						<span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
							{preview.response.status}
						</span>
					</div>
					<span className="text-muted-foreground truncate font-mono text-[9px]">
						{preview.id.slice(0, 8)}
					</span>
				</div>
			</div>
		</div>
	);
}
