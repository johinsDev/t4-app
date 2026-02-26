"use client";

import { trpc } from "@/trpc/client";
import { PhonePreview } from "./phone-preview";

export function LatestPreviewClient() {
	const { data: previews } = trpc.sms.listPreviews.useQuery(undefined, {
		refetchInterval: 5000,
	});

	const latest = previews?.[0];
	if (!latest) {
		return <p className="text-muted-foreground text-sm">Send an SMS to see a preview here.</p>;
	}

	return <PhonePreview preview={latest} />;
}
