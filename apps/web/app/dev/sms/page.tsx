import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LatestPreviewClient } from "@/features/dev/sms/latest-preview";
import { PreviewList } from "@/features/dev/sms/preview-list";
import { SendForm } from "@/features/dev/sms/send-form";

export default function SmsTestPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-12">
			<div className="mb-8">
				<h1 className="text-2xl font-semibold tracking-tight">SMS Test Console</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Send test SMS via the JSON provider. Each message opens as an HTML preview in your
					browser.
				</p>
			</div>

			<div className="grid gap-8 lg:grid-cols-[1fr_320px]">
				<Card>
					<CardHeader>
						<CardTitle>Send Test SMS</CardTitle>
						<CardDescription>
							Messages are not actually delivered — they are saved locally and opened as HTML
							previews.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<SendForm />
					</CardContent>
				</Card>

				<div className="hidden lg:block">
					<p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
						Latest Preview
					</p>
					<LatestPreviewClient />
				</div>
			</div>

			<div className="mt-12">
				<h2 className="mb-4 text-lg font-semibold">Sent Messages</h2>
				<PreviewList />
			</div>
		</div>
	);
}
