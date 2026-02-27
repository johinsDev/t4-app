"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/trpc/client";

export function SendCustomForm() {
	const [to, setTo] = useState("user@example.com");
	const [subject, setSubject] = useState("Test Email");
	const [html, setHtml] = useState("<h1>Hello!</h1>\n<p>This is a test email.</p>");
	const utils = trpc.useUtils();

	const sendTest = trpc.email.sendTest.useMutation({
		onSuccess: () => {
			utils.email.listPreviews.invalidate();
		},
	});

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (!to || !subject || !html) return;
			sendTest.mutate({ to, subject, html });
		},
		[to, subject, html, sendTest],
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="custom-to">To</Label>
				<Input
					id="custom-to"
					type="email"
					placeholder="user@example.com"
					value={to}
					onChange={(e) => setTo(e.target.value)}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="custom-subject">Subject</Label>
				<Input
					id="custom-subject"
					placeholder="Email subject"
					value={subject}
					onChange={(e) => setSubject(e.target.value)}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="custom-html">HTML Body</Label>
				<Textarea
					id="custom-html"
					placeholder="<h1>Hello!</h1>"
					value={html}
					onChange={(e) => setHtml(e.target.value)}
					rows={6}
					className="font-mono text-sm"
				/>
			</div>

			<Button type="submit" disabled={sendTest.isPending || !to || !subject || !html}>
				{sendTest.isPending ? "Sending..." : "Send Custom Email"}
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
