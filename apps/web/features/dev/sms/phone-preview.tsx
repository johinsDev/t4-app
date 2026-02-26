import type { SMSPreview } from "@/lib/sms";

export function PhonePreview({ preview }: { preview: SMSPreview }) {
	const time = new Date(preview.sentAt).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});

	return (
		<div className="mx-auto w-[320px] shrink-0">
			<div className="ring-foreground/10 flex min-h-[420px] flex-col overflow-hidden rounded-[32px] bg-white ring-1 dark:bg-zinc-900">
				{/* Notch */}
				<div className="relative flex h-8 items-center justify-center">
					<div className="absolute top-2.5 h-1.5 w-24 rounded-full bg-zinc-800 dark:bg-zinc-200" />
				</div>

				{/* Header */}
				<div className="border-b px-4 pb-2.5 text-center">
					<p className="text-sm font-semibold">{preview.message.to}</p>
					{preview.message.from && (
						<p className="text-muted-foreground text-xs">from {preview.message.from}</p>
					)}
				</div>

				{/* Messages */}
				<div className="flex flex-1 flex-col justify-end gap-1 p-4">
					<p className="text-muted-foreground mb-2 text-center text-[11px]">{time}</p>
					<div className="max-w-[75%] self-end rounded-2xl rounded-br-sm bg-emerald-500 px-3.5 py-2.5 text-sm leading-snug text-white break-words">
						{preview.message.content}
					</div>
				</div>

				{/* Meta */}
				<div className="border-t bg-zinc-50 p-3 dark:bg-zinc-800/50">
					<div className="grid grid-cols-2 gap-2 text-[11px]">
						<div>
							<span className="text-muted-foreground block font-medium uppercase tracking-wide text-[9px]">
								Encoding
							</span>
							<span
								className={
									preview.segmentInfo.encoding === "GSM-7" ? "text-emerald-600" : "text-orange-600"
								}
							>
								{preview.segmentInfo.encoding}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground block font-medium uppercase tracking-wide text-[9px]">
								Segments
							</span>
							{preview.segmentInfo.segments} ({preview.segmentInfo.characters} chars)
						</div>
						<div>
							<span className="text-muted-foreground block font-medium uppercase tracking-wide text-[9px]">
								Provider
							</span>
							{preview.response.provider}
						</div>
						<div>
							<span className="text-muted-foreground block font-medium uppercase tracking-wide text-[9px]">
								Status
							</span>
							{preview.response.status}
						</div>
					</div>
					<p className="text-muted-foreground mt-2 truncate font-mono text-[9px]">{preview.id}</p>
				</div>
			</div>
		</div>
	);
}
