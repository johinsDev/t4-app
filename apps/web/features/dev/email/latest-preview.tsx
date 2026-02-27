"use client";

import { trpc } from "@/trpc/client";
import { EmailPreviewCard } from "./email-preview";

export function LatestPreviewClient() {
	const { data: previews } = trpc.email.listPreviews.useQuery(undefined, {
		refetchInterval: 5000,
	});

	const latest = previews?.[0];
	if (!latest) {
		return <p className="text-muted-foreground text-sm">Send an email to see a preview here.</p>;
	}

	return <EmailPreviewCard preview={latest} />;
}
