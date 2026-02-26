"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isGsm7, smsSegmentInfo } from "@/lib/sms/schemas";
import { trpc } from "@/trpc/client";

export function SendForm() {
	const [to, setTo] = useState("+1234567890");
	const [content, setContent] = useState("");
	const utils = trpc.useUtils();

	const sendTest = trpc.sms.sendTest.useMutation({
		onSuccess: () => {
			setContent("");
			utils.sms.listPreviews.invalidate();
		},
	});

	const info = content.length > 0 ? smsSegmentInfo(content) : null;
	const gsm7 = content.length > 0 ? isGsm7(content) : true;

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (!to || !content) return;
			sendTest.mutate({ to, content });
		},
		[to, content, sendTest],
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="to">To (E.164)</Label>
				<Input
					id="to"
					type="tel"
					placeholder="+1234567890"
					value={to}
					onChange={(e) => setTo(e.target.value)}
				/>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label htmlFor="content">Message</Label>
					{info && (
						<div className="flex items-center gap-2 text-xs">
							<Badge variant={gsm7 ? "default" : "secondary"}>{info.encoding}</Badge>
							<span className="text-muted-foreground">
								{info.characters} chars &middot; {info.segments}{" "}
								{info.segments === 1 ? "segment" : "segments"}
							</span>
						</div>
					)}
				</div>
				<Textarea
					id="content"
					placeholder="Type your SMS message..."
					value={content}
					onChange={(e) => setContent(e.target.value)}
					rows={3}
				/>
				<div className="text-muted-foreground text-xs">
					{content.length}/1600 &middot; Max per segment: {gsm7 ? 160 : 70} chars
				</div>
			</div>

			<Button type="submit" disabled={sendTest.isPending || !to || !content}>
				{sendTest.isPending ? "Sending..." : "Send Test SMS"}
			</Button>

			{sendTest.isError && <p className="text-destructive text-sm">{sendTest.error.message}</p>}

			{sendTest.isSuccess && (
				<p className="text-sm text-emerald-600">
					Sent! Check your browser — preview should have opened.
				</p>
			)}
		</form>
	);
}
