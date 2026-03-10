import { clientMessageSchema, type LoyaltyStatus } from "@repo/realtime-types";
import type * as Party from "partykit/server";
import { extractTokenFromUrl, verifyToken } from "../lib/auth";

interface ConnectionState {
	userId: string;
	userName: string;
}

const DEFAULT_STATUS: LoyaltyStatus = {
	mode: "points",
	points: 0,
	labels: [],
};

export default class LoyaltyParty implements Party.Server {
	options: Party.ServerOptions = { hibernate: true };

	constructor(readonly room: Party.Room) {}

	// ── Auth gate ──

	static async onBeforeConnect(req: Party.Request, lobby: Party.Lobby) {
		const token = extractTokenFromUrl(req.url);
		if (!token) {
			return new Response("Missing token", { status: 401 });
		}
		try {
			await verifyToken(token, lobby.env.JWT_SECRET as string);
			return req;
		} catch {
			return new Response("Invalid token", { status: 401 });
		}
	}

	// ── Connection lifecycle ──

	async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		const token = extractTokenFromUrl(ctx.request.url);
		if (!token) return;

		try {
			const payload = await verifyToken(token, this.room.env.JWT_SECRET as string);
			conn.setState({ userId: payload.userId, userName: payload.userName });

			// Send this user's loyalty status from DO storage
			const status =
				(await this.room.storage.get<LoyaltyStatus>(`status:${payload.userId}`)) ?? DEFAULT_STATUS;
			conn.send(JSON.stringify({ type: "loyalty:status", payload: status }));
		} catch {
			conn.close(4001, "Authentication failed");
		}
	}

	async onMessage(message: string, sender: Party.Connection) {
		const state = sender.state as ConnectionState | undefined;
		if (!state) return;

		let validated: ReturnType<typeof clientMessageSchema.parse>;
		try {
			validated = clientMessageSchema.parse(JSON.parse(message));
		} catch {
			sender.send(
				JSON.stringify({
					type: "error",
					payload: { code: "INVALID_MESSAGE", message: "Invalid message format" },
				}),
			);
			return;
		}

		if (validated.type === "loyalty:add_purchase") {
			const targetUserId = validated.payload.targetUserId;

			// Load target user's status (not global)
			const status = (await this.room.storage.get<LoyaltyStatus>(`status:${targetUserId}`)) ?? {
				...DEFAULT_STATUS,
			};

			if (status.mode === "points") {
				const amount = validated.payload.amount ?? 1;
				status.points += amount;
			} else {
				const label = validated.payload.label ?? "purchase";
				status.labels.push(label);
			}

			// Persist target user's updated status
			await this.room.storage.put(`status:${targetUserId}`, status);

			const purchaseEvent = JSON.stringify({
				type: "loyalty:purchase_added",
				payload: {
					addedBy: state.userName,
					amount: validated.payload.amount,
					label: validated.payload.label,
					newTotal: status.mode === "points" ? status.points : status.labels.length,
					timestamp: Date.now(),
				},
			});

			const statusUpdate = JSON.stringify({ type: "loyalty:status", payload: status });

			// Send updates only to the target user's connections
			for (const conn of this.room.getConnections()) {
				const connState = conn.state as ConnectionState | undefined;
				if (connState?.userId === targetUserId) {
					conn.send(statusUpdate);
					conn.send(purchaseEvent);
				}
			}

			// Also notify the cashier (sender) with the purchase event if they're not the target
			if (state.userId !== targetUserId) {
				sender.send(purchaseEvent);
			}
		}
	}
}

LoyaltyParty satisfies Party.Worker;
