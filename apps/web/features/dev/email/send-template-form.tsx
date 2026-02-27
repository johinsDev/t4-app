"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/trpc/client";

export function SendTemplateForm() {
	const [to, setTo] = useState("user@example.com");
	const [name, setName] = useState("John");
	const utils = trpc.useUtils();

	const sendWelcome = trpc.email.sendWelcome.useMutation({
		onSuccess: () => {
			utils.email.listPreviews.invalidate();
		},
	});

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (!to || !name) return;
			sendWelcome.mutate({ to, name });
		},
		[to, name, sendWelcome],
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="tpl-to">To</Label>
				<Input
					id="tpl-to"
					type="email"
					placeholder="user@example.com"
					value={to}
					onChange={(e) => setTo(e.target.value)}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="tpl-name">Recipient Name</Label>
				<Input
					id="tpl-name"
					placeholder="John"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</div>

			<div className="rounded-md border bg-zinc-50 p-4 dark:bg-zinc-900">
				<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
					Template
				</p>
				<p className="mt-1 text-sm font-semibold">Welcome Email</p>
				<p className="text-muted-foreground mt-0.5 text-xs">
					Subject: &ldquo;Welcome to T4 App!&rdquo; &middot; Uses{" "}
					<code className="text-xs">emails/welcome.tsx</code>
				</p>
			</div>

			<Button type="submit" disabled={sendWelcome.isPending || !to || !name}>
				{sendWelcome.isPending ? "Sending..." : "Send Welcome Email"}
			</Button>

			{sendWelcome.isError && (
				<p className="text-destructive text-sm">{sendWelcome.error.message}</p>
			)}

			{sendWelcome.isSuccess && (
				<p className="text-sm text-emerald-600">
					Sent! Check your browser — preview should have opened.
				</p>
			)}
		</form>
	);
}
