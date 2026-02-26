import { Separator } from "@/components/ui/separator";

export function OrDivider() {
	return (
		<div className="flex items-center gap-3">
			<Separator className="flex-1" />
			<span className="text-muted-foreground text-xs uppercase">or</span>
			<Separator className="flex-1" />
		</div>
	);
}
