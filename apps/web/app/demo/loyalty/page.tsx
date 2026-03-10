"use client";

import { Gift, ShoppingBag, User, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { LoyaltyProvider, useLoyaltyContext, usePartykitToken } from "@/lib/partykit";
import { trpc } from "@/trpc/client";

const LABEL_OPTIONS = ["coffee", "sandwich", "pastry", "juice", "combo"];

// ── Cashier Panel (left side) ──

function CashierPanel() {
	const { isConnected, addPurchase, status } = useLoyaltyContext();
	const { data: clients, isLoading: clientsLoading } = trpc.loyalty.clients.useQuery();
	const [selectedClient, setSelectedClient] = useState<string | null>(null);
	const [amount, setAmount] = useState("1");
	const [label, setLabel] = useState<string | null>("coffee");

	const isPoints = status?.mode === "points";

	function handleSubmit() {
		if (!selectedClient) {
			toast.error("Selecciona un cliente");
			return;
		}

		addPurchase({
			targetUserId: selectedClient,
			...(isPoints ? { amount: Number(amount) || 1 } : { label: label ?? "coffee" }),
		});

		const clientName = clients?.find((c) => c.id === selectedClient)?.name;
		toast.success(
			isPoints
				? `+${amount} puntos para ${clientName}`
				: `Label "${label}" agregado a ${clientName}`,
		);
	}

	return (
		<Card className="flex-1">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<ShoppingBag className="size-5" />
						<CardTitle>Cajero</CardTitle>
					</div>
					<ConnectionBadge connected={isConnected} />
				</div>
				<CardDescription>Registra compras para los clientes</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label>Cliente</Label>
					{clientsLoading ? (
						<Skeleton className="h-9 w-full" />
					) : !clients?.length ? (
						<p className="text-muted-foreground text-sm">
							No hay otros usuarios registrados. Crea otra cuenta para probar.
						</p>
					) : (
						<Select value={selectedClient} onValueChange={setSelectedClient}>
							<SelectTrigger>
								<SelectValue placeholder="Seleccionar cliente..." />
							</SelectTrigger>
							<SelectContent>
								{clients.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>

				{isPoints ? (
					<div className="space-y-2">
						<Label>Puntos a agregar</Label>
						<Input
							type="number"
							min={1}
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
						/>
					</div>
				) : (
					<div className="space-y-2">
						<Label>Tipo de compra</Label>
						<Select value={label} onValueChange={setLabel}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{LABEL_OPTIONS.map((l) => (
									<SelectItem key={l} value={l}>
										{l}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				<Button
					onClick={handleSubmit}
					disabled={!isConnected || !selectedClient}
					className="w-full"
				>
					Registrar compra
				</Button>

				{status && (
					<>
						<Separator />
						<div className="text-muted-foreground text-xs">
							Modo actual: <Badge variant="outline">{status.mode}</Badge>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

// ── Client Panel (right side) ──

function ClientPanel() {
	const { isConnected, status, lastPurchase } = useLoyaltyContext();
	const [purchases, setPurchases] = useState<
		Array<{
			addedBy: string;
			amount?: number;
			label?: string;
			newTotal: number;
			timestamp: number;
		}>
	>([]);

	useEffect(() => {
		if (lastPurchase) {
			setPurchases((prev) => [lastPurchase, ...prev].slice(0, 20));
			toast(`Compra registrada por ${lastPurchase.addedBy}`, {
				description:
					lastPurchase.amount != null
						? `+${lastPurchase.amount} puntos (Total: ${lastPurchase.newTotal})`
						: `Label: ${lastPurchase.label} (Total: ${lastPurchase.newTotal})`,
				icon: <Gift className="size-4" />,
			});
		}
	}, [lastPurchase]);

	return (
		<Card className="flex-1">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Gift className="size-5" />
						<CardTitle>Mi Lealtad</CardTitle>
					</div>
					<ConnectionBadge connected={isConnected} />
				</div>
				<CardDescription>Vista del cliente - actualizaciones en tiempo real</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!status ? (
					<div className="flex items-center justify-center py-8">
						<Spinner className="size-6" />
					</div>
				) : status.mode === "points" ? (
					<div className="rounded-lg border p-6 text-center">
						<div className="text-4xl font-bold">{status.points}</div>
						<div className="text-muted-foreground text-sm">puntos acumulados</div>
					</div>
				) : (
					<div className="space-y-2">
						<div className="text-sm font-medium">Labels ({status.labels.length})</div>
						<div className="flex flex-wrap gap-1.5">
							{status.labels.length === 0 ? (
								<span className="text-muted-foreground text-sm">Sin labels todavia</span>
							) : (
								status.labels.map((l, i) => (
									<Badge key={`${l}-${status.labels.slice(0, i).filter((x) => x === l).length}`}>
										{l}
									</Badge>
								))
							)}
						</div>
					</div>
				)}

				<Separator />

				<div className="space-y-2">
					<div className="text-sm font-medium">Historial reciente</div>
					{purchases.length === 0 ? (
						<p className="text-muted-foreground text-sm">Esperando compras en tiempo real...</p>
					) : (
						<div className="space-y-2">
							{purchases.map((p) => (
								<div
									key={p.timestamp}
									className="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm"
								>
									<span>
										{p.amount != null ? `+${p.amount} pts` : p.label}{" "}
										<span className="text-muted-foreground">por {p.addedBy}</span>
									</span>
									<span className="text-muted-foreground text-xs">
										{new Date(p.timestamp).toLocaleTimeString()}
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ── Connection badge ──

function ConnectionBadge({ connected }: { connected: boolean }) {
	return (
		<Badge variant={connected ? "default" : "destructive"} className="gap-1">
			{connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
			{connected ? "Conectado" : "Desconectado"}
		</Badge>
	);
}

// ── Main page ──

function CurrentUserBanner() {
	const { data: session } = authClient.useSession();

	if (!session?.user) return null;

	return (
		<div className="bg-muted flex items-center gap-2 rounded-lg px-4 py-2 text-sm">
			<User className="text-muted-foreground size-4" />
			<span>
				Logueado como <span className="font-medium">{session.user.name}</span>
			</span>
			<Badge variant="secondary" className="font-mono text-xs">
				{session.user.id}
			</Badge>
		</div>
	);
}

function DemoContent() {
	return (
		<div className="flex min-h-svh flex-col gap-6 p-6">
			<div className="space-y-3">
				<h1 className="text-2xl font-bold">Demo: Loyalty Real-time</h1>
				<p className="text-muted-foreground text-sm">
					Abre esta pagina en dos pestanas para simular cajero y cliente. Las compras se actualizan
					en tiempo real via PartyKit.
				</p>
				<CurrentUserBanner />
			</div>
			<div className="flex flex-1 flex-col gap-6 md:flex-row">
				<CashierPanel />
				<ClientPanel />
			</div>
		</div>
	);
}

export default function LoyaltyDemoPage() {
	const { token, host, isLoading, error } = usePartykitToken();

	if (isLoading) {
		return (
			<div className="flex min-h-svh items-center justify-center">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-svh items-center justify-center">
				<Card className="max-w-md">
					<CardHeader>
						<CardTitle>Error</CardTitle>
						<CardDescription>{error}</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							Asegurate de estar logueado y que PartyKit este corriendo en{" "}
							<code className="bg-muted rounded px-1">bun run dev</code>.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!token || !host) return null;

	return (
		<LoyaltyProvider host={host} room="demo-loyalty" token={token}>
			<DemoContent />
		</LoyaltyProvider>
	);
}
