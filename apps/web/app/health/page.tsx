import {
	ActivityIcon,
	CircleCheckIcon,
	CircleXIcon,
	DatabaseIcon,
	HardDriveIcon,
	MailIcon,
	SearchIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/trpc/server";

const serviceIcons: Record<string, React.ReactNode> = {
	Database: <DatabaseIcon className="size-5" />,
	Cache: <HardDriveIcon className="size-5" />,
	"Vector DB": <SearchIcon className="size-5" />,
	Search: <SearchIcon className="size-5" />,
	Email: <MailIcon className="size-5" />,
};

const planned = [
	{ name: "Vector DB", description: "Embeddings & similarity search" },
	{ name: "Search", description: "Full-text search" },
	{ name: "Email", description: "Transactional emails" },
];

export default async function HealthDashboard() {
	const checks = await trpc.health.all();
	const allOk = checks.every((c) => c.status === "ok");

	return (
		<div className="mx-auto max-w-4xl px-4 py-12">
			<div className="mb-8 flex items-center gap-3">
				<ActivityIcon className="size-6" />
				<h1 className="text-2xl font-semibold tracking-tight">Service Health</h1>
				<Badge variant={allOk ? "default" : "destructive"} className="ml-auto">
					{allOk ? "All systems operational" : "Degraded"}
				</Badge>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				{checks.map((check) => (
					<Card key={check.name}>
						<CardHeader>
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground">
									{serviceIcons[check.name] ?? <ActivityIcon className="size-5" />}
								</span>
								<CardTitle>{check.name}</CardTitle>
								{check.status === "ok" ? (
									<CircleCheckIcon className="ml-auto size-5 text-emerald-500" />
								) : (
									<CircleXIcon className="ml-auto size-5 text-destructive" />
								)}
							</div>
							<CardDescription>
								{check.error ?? `Responded in ${check.latencyMs}ms`}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="text-muted-foreground flex items-center justify-between text-xs">
								<span>
									Latency: {check.latencyMs}ms
									{"provider" in check && ` · ${check.provider}`}
								</span>
								<span>{new Date(check.timestamp).toLocaleTimeString()}</span>
							</div>
						</CardContent>
					</Card>
				))}

				{planned.map((service) => (
					<Card key={service.name} className="opacity-50">
						<CardHeader>
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground">
									{serviceIcons[service.name] ?? <ActivityIcon className="size-5" />}
								</span>
								<CardTitle>{service.name}</CardTitle>
								<Badge variant="outline" className="ml-auto">
									Planned
								</Badge>
							</div>
							<CardDescription>{service.description}</CardDescription>
						</CardHeader>
					</Card>
				))}
			</div>
		</div>
	);
}
