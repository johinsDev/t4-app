"use client";

import { trpc } from "@/trpc/client";
import { PhonePreview } from "./phone-preview";

export function PreviewList() {
	const { data: previews, isLoading } = trpc.sms.listPreviews.useQuery(undefined, {
		refetchInterval: 5000,
	});

	if (isLoading) {
		return <p className="text-muted-foreground text-sm">Loading previews...</p>;
	}

	if (!previews?.length) {
		return (
			<p className="text-muted-foreground text-sm">
				No SMS sent yet. Use the form above to send a test SMS.
			</p>
		);
	}

	return (
		<div className="flex gap-6 overflow-x-auto pb-4">
			{previews.map((preview) => (
				<PhonePreview key={preview.id} preview={preview} />
			))}
		</div>
	);
}
