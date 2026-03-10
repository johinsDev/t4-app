"use client";

import type { LoyaltyStatus, ServerMessage } from "@repo/realtime-types";
import PartySocket from "partysocket";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";

interface PurchaseEvent {
	addedBy: string;
	amount?: number;
	label?: string;
	newTotal: number;
	timestamp: number;
}

interface LoyaltyContextValue {
	isConnected: boolean;
	error: string | null;
	status: LoyaltyStatus | null;
	lastPurchase: PurchaseEvent | null;
	addPurchase: (data: { targetUserId: string; amount?: number; label?: string }) => void;
}

const LoyaltyContext = createContext<LoyaltyContextValue>({
	isConnected: false,
	error: null,
	status: null,
	lastPurchase: null,
	addPurchase: () => {},
});

export function useLoyaltyContext() {
	return useContext(LoyaltyContext);
}

interface LoyaltyProviderProps {
	host: string;
	room: string;
	token: string;
	children: ReactNode;
}

export function LoyaltyProvider({ host, room, token, children }: LoyaltyProviderProps) {
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<LoyaltyStatus | null>(null);
	const [lastPurchase, setLastPurchase] = useState<PurchaseEvent | null>(null);
	const socketRef = useRef<PartySocket | null>(null);

	useEffect(() => {
		const socket = new PartySocket({
			host,
			room,
			query: { token },
		});

		socket.addEventListener("open", () => {
			setIsConnected(true);
			setError(null);
		});

		socket.addEventListener("close", () => {
			setIsConnected(false);
		});

		socket.addEventListener("error", () => {
			setError("WebSocket connection error");
		});

		socket.addEventListener("message", (event) => {
			let msg: ServerMessage;
			try {
				msg = JSON.parse(event.data);
			} catch {
				return;
			}

			switch (msg.type) {
				case "loyalty:status":
					setStatus(msg.payload);
					break;
				case "loyalty:purchase_added":
					setLastPurchase(msg.payload);
					break;
			}
		});

		socketRef.current = socket;

		return () => {
			socket.close();
			socketRef.current = null;
		};
	}, [host, room, token]);

	const addPurchase = (data: { targetUserId: string; amount?: number; label?: string }) => {
		socketRef.current?.send(JSON.stringify({ type: "loyalty:add_purchase", payload: data }));
	};

	return (
		<LoyaltyContext.Provider value={{ isConnected, error, status, lastPurchase, addPurchase }}>
			{children}
		</LoyaltyContext.Provider>
	);
}
