import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LatestPreviewClient } from "@/features/dev/email/latest-preview";
import { PreviewList } from "@/features/dev/email/preview-list";
import { SendCustomForm } from "@/features/dev/email/send-custom-form";
import { SendTemplateForm } from "@/features/dev/email/send-template-form";

export default function EmailTestPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-12">
			<div className="mb-8">
				<h1 className="text-2xl font-semibold tracking-tight">Email Test Console</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Send test emails via the JSON provider. Each message opens as an HTML preview in your
					browser.
				</p>
			</div>

			<div className="grid gap-8 lg:grid-cols-[1fr_360px]">
				<Card>
					<CardHeader>
						<CardTitle>Send Test Email</CardTitle>
						<CardDescription>
							Messages are not actually delivered — they are saved locally and opened as HTML
							previews.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="custom">
							<TabsList>
								<TabsTrigger value="custom">Custom HTML</TabsTrigger>
								<TabsTrigger value="welcome">Welcome Template</TabsTrigger>
							</TabsList>
							<TabsContent value="custom" className="pt-4">
								<SendCustomForm />
							</TabsContent>
							<TabsContent value="welcome" className="pt-4">
								<SendTemplateForm />
							</TabsContent>
						</Tabs>
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
				<h2 className="mb-4 text-lg font-semibold">Sent Emails</h2>
				<PreviewList />
			</div>
		</div>
	);
}
