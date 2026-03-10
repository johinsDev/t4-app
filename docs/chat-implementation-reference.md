# Chat Implementation Reference

Complete blueprint for the real-time chat system built on Next.js (App Router), PartyKit (Durable Objects + WebSockets), Turso (SQLite), tRPC, and a shared `@repo/realtime-types` package.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Shared Types Package (`@repo/realtime-types`)](#2-shared-types-package-reporealtime-types)
3. [Database Layer (Drizzle + Turso)](#3-database-layer-drizzle--turso)
4. [tRPC Router](#4-trpc-router)
5. [PartyKit Server](#5-partykit-server)
6. [PartyKit Token API Route](#6-partykit-token-api-route)
7. [Message Persistence API Route](#7-message-persistence-api-route)
8. [Frontend: PartyKit Client Library](#8-frontend-partykit-client-library)
9. [Frontend: Feature Components](#9-frontend-feature-components)
10. [Frontend: App Router Pages](#10-frontend-app-router-pages)
11. [DM Room ID Convention](#11-dm-room-id-convention)
12. [Persistence Flow](#12-persistence-flow)
13. [Environment Variables](#13-environment-variables)

---

## 1. Architecture Overview

```
Browser (React)
  |
  |-- tRPC (HTTP) -----> Next.js API -----> Turso (SQLite)
  |                         |
  |                    /api/partykit/token (JWT mint)
  |                    /api/chat/persist   (message write)
  |                         ^
  |-- WebSocket ----------> PartyKit (Durable Object)
       |                         |
       |  broadcast to all       |-- DO storage (last 100 msgs)
       |  connected clients      |-- POST /api/chat/persist (fire-and-forget)
       |                                    |
       |                                    v
       |                               Turso (permanent storage)
```

### Data flow summary

| Action | Path |
|---|---|
| List rooms / messages (historical) | Browser -> tRPC query -> Turso |
| Create room / join room / start DM | Browser -> tRPC mutation -> Turso |
| Send message (real-time) | Browser -> WebSocket -> PartyKit DO -> broadcast to all peers |
| Persist message (durable) | PartyKit DO -> POST `/api/chat/persist` -> Turso |
| Load recent messages on WS connect | PartyKit DO storage -> WebSocket -> Browser |
| Merge messages in UI | Historical (tRPC/Turso) + Real-time (WS) deduped by message ID |

### Authentication flow

1. Browser calls `GET /api/partykit/token` (cookie-authenticated via better-auth session).
2. Server mints a short-lived (1 hour) HS256 JWT containing `userId`, `userName`, `sessionId`.
3. Browser opens `PartySocket` with `?token=<jwt>` query parameter.
4. PartyKit edge (`onBeforeConnect`) verifies the JWT before allowing room access.
5. PartyKit room (`onConnect`) verifies again and sets connection state.
6. Client auto-refreshes the token every 50 minutes.

---

## 2. Shared Types Package (`@repo/realtime-types`)

Shared Zod schemas and TypeScript types used by both the PartyKit server and the Next.js frontend.

### `packages/realtime-types/src/index.ts`

```ts
export * from "./auth";
export * from "./chat";
```

### `packages/realtime-types/src/auth.ts`

```ts
import { z } from "zod";

export const authTokenPayloadSchema = z.object({
	userId: z.string(),
	userName: z.string(),
	sessionId: z.string(),
	exp: z.number(),
	iat: z.number(),
});

export type AuthTokenPayload = z.infer<typeof authTokenPayloadSchema>;
```

### `packages/realtime-types/src/chat.ts`

```ts
import { z } from "zod";

// -- Client -> Server messages --

export const clientMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("chat:send"),
		payload: z.object({ message: z.string().min(1).max(2000) }),
	}),
	z.object({
		type: z.literal("chat:typing"),
		payload: z.object({ isTyping: z.boolean() }),
	}),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

// -- Server -> Client messages --

const chatMessagePayload = z.object({
	id: z.string(),
	userId: z.string(),
	userName: z.string(),
	message: z.string(),
	timestamp: z.number(),
});

export type ChatMessagePayload = z.infer<typeof chatMessagePayload>;

export const serverMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("chat:message"),
		payload: chatMessagePayload,
	}),
	z.object({
		type: z.literal("chat:history"),
		payload: z.object({ messages: z.array(chatMessagePayload) }),
	}),
	z.object({
		type: z.literal("chat:typing"),
		payload: z.object({
			userId: z.string(),
			userName: z.string(),
			isTyping: z.boolean(),
		}),
	}),
	z.object({
		type: z.literal("chat:user_joined"),
		payload: z.object({ userId: z.string(), userName: z.string() }),
	}),
	z.object({
		type: z.literal("chat:user_left"),
		payload: z.object({ userId: z.string(), userName: z.string() }),
	}),
	z.object({
		type: z.literal("chat:participants"),
		payload: z.object({
			users: z.array(z.object({ userId: z.string(), userName: z.string() })),
		}),
	}),
	z.object({
		type: z.literal("error"),
		payload: z.object({ code: z.string(), message: z.string() }),
	}),
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

// -- DM Room ID helper --

export function getDmRoomId(userA: string, userB: string): string {
	return `dm:${[userA, userB].sort().join(":")}`;
}
```

---

## 3. Database Layer (Drizzle + Turso)

### Schema -- `apps/web/db/schema/chat.ts`

Three tables: `chat_rooms`, `chat_participants`, `chat_messages`.

```ts
import { sql } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const chatRooms = sqliteTable("chat_rooms", {
	id: text().primaryKey(),
	type: text().notNull(),
	name: text(),
	createdBy: text().references(() => user.id),
	createdAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
	updatedAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const chatParticipants = sqliteTable(
	"chat_participants",
	{
		id: text().primaryKey(),
		roomId: text()
			.notNull()
			.references(() => chatRooms.id),
		userId: text()
			.notNull()
			.references(() => user.id),
		joinedAt: int({ mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
	},
	(table) => [
		index("chat_participants_room_idx").on(table.roomId),
		index("chat_participants_user_idx").on(table.userId),
	],
);

export const chatMessages = sqliteTable(
	"chat_messages",
	{
		id: text().primaryKey(),
		roomId: text()
			.notNull()
			.references(() => chatRooms.id),
		userId: text()
			.notNull()
			.references(() => user.id),
		message: text().notNull(),
		createdAt: int({ mode: "timestamp" }).notNull(),
	},
	(table) => [index("chat_messages_room_idx").on(table.roomId, table.createdAt)],
);
```

#### Schema details

| Table | Column | Type | Notes |
|---|---|---|---|
| `chat_rooms` | `id` | TEXT PK | UUID for public rooms, `dm:<sorted-user-ids>` for DMs |
| | `type` | TEXT NOT NULL | `"public"` or `"dm"` |
| | `name` | TEXT | Human-readable name (null for DMs) |
| | `createdBy` | TEXT FK -> `user.id` | Creator's user ID |
| | `createdAt` | INT (timestamp) | Unix epoch default |
| | `updatedAt` | INT (timestamp) | Unix epoch default |
| `chat_participants` | `id` | TEXT PK | UUID |
| | `roomId` | TEXT FK -> `chat_rooms.id` | |
| | `userId` | TEXT FK -> `user.id` | |
| | `joinedAt` | INT (timestamp) | Unix epoch default |
| `chat_messages` | `id` | TEXT PK | UUID (generated by PartyKit DO) |
| | `roomId` | TEXT FK -> `chat_rooms.id` | |
| | `userId` | TEXT FK -> `user.id` | |
| | `message` | TEXT NOT NULL | Message content |
| | `createdAt` | INT (timestamp) | Set from `msg.timestamp` at persist time |

#### Indexes

- `chat_participants_room_idx` on `(roomId)` -- fast participant lookups per room
- `chat_participants_user_idx` on `(userId)` -- fast "my rooms" lookups per user
- `chat_messages_room_idx` on `(roomId, createdAt)` -- fast message history with cursor pagination

### Repository -- `apps/web/db/repositories/chat.ts`

```ts
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../index";
import { chatMessages, chatParticipants, chatRooms, user } from "../schema";

export const chatRepository = {
	// -- Rooms --

	findRoomById(id: string) {
		return db.select().from(chatRooms).where(eq(chatRooms.id, id)).get();
	},

	findPublicRooms() {
		return db.select().from(chatRooms).where(eq(chatRooms.type, "public"));
	},

	findDmRoom(userA: string, userB: string) {
		const roomId = `dm:${[userA, userB].sort().join(":")}`;
		return db.select().from(chatRooms).where(eq(chatRooms.id, roomId)).get();
	},

	async findUserRooms(userId: string) {
		return db
			.select({
				id: chatRooms.id,
				type: chatRooms.type,
				name: chatRooms.name,
				createdBy: chatRooms.createdBy,
				createdAt: chatRooms.createdAt,
				updatedAt: chatRooms.updatedAt,
			})
			.from(chatParticipants)
			.innerJoin(chatRooms, eq(chatParticipants.roomId, chatRooms.id))
			.where(eq(chatParticipants.userId, userId));
	},

	createRoom(data: { id: string; type: string; name?: string | null; createdBy: string }) {
		return db.insert(chatRooms).values(data).returning().get();
	},

	// -- Participants --

	addParticipant(roomId: string, userId: string) {
		const id = crypto.randomUUID();
		return db.insert(chatParticipants).values({ id, roomId, userId }).returning().get();
	},

	removeParticipant(roomId: string, userId: string) {
		return db
			.delete(chatParticipants)
			.where(and(eq(chatParticipants.roomId, roomId), eq(chatParticipants.userId, userId)))
			.returning()
			.get();
	},

	async getRoomParticipants(roomId: string) {
		return db
			.select({
				userId: user.id,
				userName: user.name,
				image: user.image,
			})
			.from(chatParticipants)
			.innerJoin(user, eq(chatParticipants.userId, user.id))
			.where(eq(chatParticipants.roomId, roomId));
	},

	async isParticipant(roomId: string, userId: string) {
		const row = await db
			.select({ id: chatParticipants.id })
			.from(chatParticipants)
			.where(and(eq(chatParticipants.roomId, roomId), eq(chatParticipants.userId, userId)))
			.get();
		return !!row;
	},

	// -- Messages --

	async getMessages(roomId: string, limit = 50, before?: number) {
		const conditions = [eq(chatMessages.roomId, roomId)];
		if (before) {
			conditions.push(lt(chatMessages.createdAt, new Date(before)));
		}
		return db
			.select({
				id: chatMessages.id,
				roomId: chatMessages.roomId,
				userId: chatMessages.userId,
				userName: user.name,
				message: chatMessages.message,
				createdAt: chatMessages.createdAt,
			})
			.from(chatMessages)
			.innerJoin(user, eq(chatMessages.userId, user.id))
			.where(and(...conditions))
			.orderBy(desc(chatMessages.createdAt))
			.limit(limit);
	},

	createMessage(data: {
		id: string;
		roomId: string;
		userId: string;
		message: string;
		createdAt: Date;
	}) {
		return db.insert(chatMessages).values(data).returning().get();
	},

	createMessages(
		data: Array<{
			id: string;
			roomId: string;
			userId: string;
			message: string;
			createdAt: Date;
		}>,
	) {
		return db.insert(chatMessages).values(data).returning();
	},
};
```

---

## 4. tRPC Router

### `apps/web/trpc/routers/chat.ts`

Endpoints:

| Procedure | Type | Input | Description |
|---|---|---|---|
| `myRooms` | query | -- | All rooms the current user participates in |
| `publicRooms` | query | -- | All public rooms |
| `room` | query | `{ roomId }` | Single room + participants (participant check) |
| `messages` | query | `{ roomId, cursor?, limit? }` | Paginated messages (cursor = timestamp, desc order) |
| `createRoom` | mutation | `{ name }` | Create a public room, auto-join creator |
| `joinRoom` | mutation | `{ roomId }` | Join a public room (idempotent) |
| `getOrCreateDm` | mutation | `{ otherUserId }` | Get or create a DM room between two users |

```ts
import { getDmRoomId } from "@repo/realtime-types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { chatRepository } from "@/db/repositories";
import { createTRPCRouter, protectedMutation, protectedQuery } from "../init";

export const chatRouter = createTRPCRouter({
	myRooms: protectedQuery.query(async ({ ctx }) => {
		return chatRepository.findUserRooms(ctx.session.user.id);
	}),

	publicRooms: protectedQuery.query(async () => {
		return chatRepository.findPublicRooms();
	}),

	room: protectedQuery.input(z.object({ roomId: z.string() })).query(async ({ ctx, input }) => {
		const isParticipant = await chatRepository.isParticipant(input.roomId, ctx.session.user.id);
		if (!isParticipant) {
			throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
		}
		const [room, participants] = await Promise.all([
			chatRepository.findRoomById(input.roomId),
			chatRepository.getRoomParticipants(input.roomId),
		]);
		if (!room) {
			throw new TRPCError({ code: "NOT_FOUND" });
		}
		return { ...room, participants };
	}),

	messages: protectedQuery
		.input(
			z.object({
				roomId: z.string(),
				cursor: z.number().optional(),
				limit: z.number().min(1).max(100).default(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			const isParticipant = await chatRepository.isParticipant(input.roomId, ctx.session.user.id);
			if (!isParticipant) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
			}
			const messages = await chatRepository.getMessages(
				input.roomId,
				input.limit + 1,
				input.cursor,
			);
			let nextCursor: number | undefined;
			if (messages.length > input.limit) {
				const last = messages.pop();
				nextCursor = last?.createdAt?.getTime();
			}
			return { messages, nextCursor };
		}),

	createRoom: protectedMutation
		.input(z.object({ name: z.string().min(1).max(50) }))
		.mutation(async ({ ctx, input }) => {
			const id = crypto.randomUUID();
			const room = await chatRepository.createRoom({
				id,
				type: "public",
				name: input.name,
				createdBy: ctx.session.user.id,
			});
			await chatRepository.addParticipant(id, ctx.session.user.id);
			return room;
		}),

	joinRoom: protectedMutation
		.input(z.object({ roomId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const room = await chatRepository.findRoomById(input.roomId);
			if (!room) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			if (room.type !== "public") {
				throw new TRPCError({ code: "FORBIDDEN", message: "Cannot join non-public rooms" });
			}
			const already = await chatRepository.isParticipant(input.roomId, ctx.session.user.id);
			if (!already) {
				await chatRepository.addParticipant(input.roomId, ctx.session.user.id);
			}
			return room;
		}),

	getOrCreateDm: protectedMutation
		.input(z.object({ otherUserId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const myId = ctx.session.user.id;
			if (myId === input.otherUserId) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot DM yourself" });
			}
			const roomId = getDmRoomId(myId, input.otherUserId);
			const existing = await chatRepository.findRoomById(roomId);
			if (existing) return existing;

			const room = await chatRepository.createRoom({
				id: roomId,
				type: "dm",
				name: null,
				createdBy: myId,
			});
			await Promise.all([
				chatRepository.addParticipant(roomId, myId),
				chatRepository.addParticipant(roomId, input.otherUserId),
			]);
			return room;
		}),
});
```

### Cursor-based pagination pattern

The `messages` query uses "limit + 1" pagination:

1. Fetch `limit + 1` rows ordered by `createdAt DESC`.
2. If the result has more than `limit` rows, pop the last one and use its `createdAt` timestamp as `nextCursor`.
3. The client passes `cursor` on the next request to fetch older messages.

---

## 5. PartyKit Server

### Configuration -- `apps/partykit/partykit.json`

```json
{
	"name": "t4-app",
	"main": "src/parties/chat.ts",
	"compatibilityDate": "2024-12-01"
}
```

### Auth helper -- `apps/partykit/src/lib/auth.ts`

```ts
import { type AuthTokenPayload, authTokenPayloadSchema } from "@repo/realtime-types";
import { jwtVerify } from "jose";

export async function verifyToken(token: string, secret: string): Promise<AuthTokenPayload> {
	const key = new TextEncoder().encode(secret);
	const { payload } = await jwtVerify(token, key);
	return authTokenPayloadSchema.parse(payload);
}

export function extractTokenFromUrl(url: string): string | null {
	return new URL(url).searchParams.get("token");
}
```

### Chat party -- `apps/partykit/src/parties/chat.ts`

```ts
import { type ChatMessagePayload, clientMessageSchema } from "@repo/realtime-types";
import type * as Party from "partykit/server";
import { extractTokenFromUrl, verifyToken } from "../lib/auth";

interface ConnectionState {
	userId: string;
	userName: string;
}

export default class ChatParty implements Party.Server {
	options: Party.ServerOptions = { hibernate: true };

	constructor(readonly room: Party.Room) {}

	// -- Auth gate (runs at edge before room access) --

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

	// -- Connection lifecycle --

	async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		const token = extractTokenFromUrl(ctx.request.url);
		if (!token) return;

		try {
			const payload = await verifyToken(token, this.room.env.JWT_SECRET as string);
			conn.setState({ userId: payload.userId, userName: payload.userName });

			// Send recent messages from DO storage
			const messages = (await this.room.storage.get<ChatMessagePayload[]>("messages")) ?? [];
			conn.send(JSON.stringify({ type: "chat:history", payload: { messages } }));

			// Send current participants list
			const participants = this.getConnectedUsers();
			conn.send(JSON.stringify({ type: "chat:participants", payload: { users: participants } }));

			// Broadcast user_joined to others
			this.room.broadcast(
				JSON.stringify({
					type: "chat:user_joined",
					payload: { userId: payload.userId, userName: payload.userName },
				}),
				[conn.id],
			);
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

		if (validated.type === "chat:send") {
			const chatMsg: ChatMessagePayload = {
				id: crypto.randomUUID(),
				userId: state.userId,
				userName: state.userName,
				message: validated.payload.message,
				timestamp: Date.now(),
			};

			// 1. Broadcast immediately
			this.room.broadcast(JSON.stringify({ type: "chat:message", payload: chatMsg }));

			// 2. Store in DO (keep last 100)
			const messages = (await this.room.storage.get<ChatMessagePayload[]>("messages")) ?? [];
			messages.push(chatMsg);
			if (messages.length > 100) messages.shift();
			await this.room.storage.put("messages", messages);

			// 3. Persist to Turso via Next.js API (fire-and-forget)
			this.persistMessage(chatMsg);
		}

		if (validated.type === "chat:typing") {
			this.room.broadcast(
				JSON.stringify({
					type: "chat:typing",
					payload: {
						userId: state.userId,
						userName: state.userName,
						isTyping: validated.payload.isTyping,
					},
				}),
				[sender.id],
			);
		}
	}

	onClose(conn: Party.Connection) {
		const state = conn.state as ConnectionState | undefined;
		if (state) {
			this.room.broadcast(
				JSON.stringify({
					type: "chat:user_left",
					payload: { userId: state.userId, userName: state.userName },
				}),
			);
		}
	}

	// -- Persist to Turso via Next.js --

	private async persistMessage(msg: ChatMessagePayload) {
		try {
			const apiUrl = this.room.env.NEXT_API_URL as string;
			const apiSecret = this.room.env.API_SECRET as string;
			await fetch(`${apiUrl}/api/chat/persist`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiSecret}`,
				},
				body: JSON.stringify({ roomId: this.room.id, ...msg }),
			});
		} catch (err) {
			console.error("Failed to persist message:", err);
		}
	}

	// -- Helpers --

	private getConnectedUsers(): Array<{ userId: string; userName: string }> {
		const users = new Map<string, { userId: string; userName: string }>();
		for (const conn of this.room.getConnections()) {
			const s = conn.state as ConnectionState | undefined;
			if (s) users.set(s.userId, { userId: s.userId, userName: s.userName });
		}
		return Array.from(users.values());
	}
}

ChatParty satisfies Party.Worker;
```

### PartyKit integration details

| Feature | Implementation |
|---|---|
| Hibernation | `options: { hibernate: true }` -- DO sleeps when no connections, wakes on new connection |
| Auth at edge | `static onBeforeConnect` -- runs at Cloudflare edge, rejects before DO wakes |
| Auth in room | `onConnect` verifies JWT again, sets `ConnectionState` on the connection |
| Message storage | DO storage keeps last 100 messages as a single array under key `"messages"` |
| History on join | New connections receive `chat:history` with DO-stored messages |
| Participants | `chat:participants` sent on connect; `chat:user_joined`/`chat:user_left` broadcast on changes |
| Typing indicators | `chat:typing` broadcast to all except sender; client auto-clears after 3 seconds |
| Persistence | Fire-and-forget `POST /api/chat/persist` to Next.js, which writes to Turso |

### PartyKit environment variables

Set these in PartyKit's environment (dashboard or `--var` flags):

- `JWT_SECRET` -- same value as `PARTYKIT_JWT_SECRET` in the Next.js app
- `NEXT_API_URL` -- base URL of the Next.js app (e.g., `https://myapp.com`)
- `API_SECRET` -- same value as `PARTYKIT_API_SECRET` in the Next.js app

---

## 6. PartyKit Token API Route

### `apps/web/app/api/partykit/token/route.ts`

Mints a JWT for the currently authenticated user. Called by the frontend before opening a WebSocket.

```ts
import { SignJWT } from "jose";
import { env } from "@/env";
import { getSession } from "@/lib/auth-server";

export async function GET() {
	const session = await getSession();
	if (!session?.user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const key = new TextEncoder().encode(env.PARTYKIT_JWT_SECRET);
	const token = await new SignJWT({
		userId: session.user.id,
		userName: session.user.name,
		sessionId: session.session.id,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("1h")
		.sign(key);

	return Response.json({ token, host: env.PARTYKIT_HOST });
}
```

### Token payload

```json
{
  "userId": "user_abc123",
  "userName": "Johan",
  "sessionId": "sess_xyz789",
  "iat": 1710000000,
  "exp": 1710003600
}
```

The token is HS256-signed. Both the Next.js app (`PARTYKIT_JWT_SECRET`) and the PartyKit server (`JWT_SECRET`) share the same secret.

---

## 7. Message Persistence API Route

### `apps/web/app/api/chat/persist/route.ts`

Called by the PartyKit server (server-to-server) to write each message to Turso. Authenticated with a shared secret.

```ts
import { chatRepository } from "@/db/repositories";
import { env } from "@/env";

export async function POST(req: Request) {
	const auth = req.headers.get("Authorization");
	if (auth !== `Bearer ${env.PARTYKIT_API_SECRET}`) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await req.json();
	await chatRepository.createMessage({
		id: body.id,
		roomId: body.roomId,
		userId: body.userId,
		message: body.message,
		createdAt: new Date(body.timestamp),
	});

	return Response.json({ ok: true });
}
```

### Request body

```json
{
  "id": "msg-uuid",
  "roomId": "room-uuid-or-dm:sorted:ids",
  "userId": "user_abc123",
  "userName": "Johan",
  "message": "Hello!",
  "timestamp": 1710000000000
}
```

---

## 8. Frontend: PartyKit Client Library

### `apps/web/lib/partykit/index.ts`

```ts
export { ChatProvider, useChatContext } from "./provider";
export { usePartykitToken } from "./use-partykit-token";
```

### `apps/web/lib/partykit/use-partykit-token.ts`

Fetches and auto-refreshes the PartyKit JWT.

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TokenState {
	token: string | null;
	host: string | null;
	isLoading: boolean;
	error: string | null;
}

export function usePartykitToken() {
	const [state, setState] = useState<TokenState>({
		token: null,
		host: null,
		isLoading: true,
		error: null,
	});
	const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const fetchToken = useCallback(async () => {
		try {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));
			const res = await fetch("/api/partykit/token");
			if (!res.ok) {
				throw new Error(`Token fetch failed: ${res.status}`);
			}
			const data = await res.json();
			setState({ token: data.token, host: data.host, isLoading: false, error: null });

			// Auto-refresh at 50 min (for 1h token)
			clearTimeout(refreshTimerRef.current);
			refreshTimerRef.current = setTimeout(fetchToken, 50 * 60 * 1000);
		} catch (err) {
			setState({
				token: null,
				host: null,
				isLoading: false,
				error: err instanceof Error ? err.message : "Failed to fetch token",
			});
		}
	}, []);

	useEffect(() => {
		fetchToken();
		return () => clearTimeout(refreshTimerRef.current);
	}, [fetchToken]);

	return { ...state, refetch: fetchToken };
}
```

### `apps/web/lib/partykit/provider.tsx`

React context wrapping `PartySocket`. Manages the WebSocket connection, message state, typing indicators, and participant list.

```tsx
"use client";

import type { ChatMessagePayload, ServerMessage } from "@repo/realtime-types";
import PartySocket from "partysocket";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";

interface TypingUser {
	userId: string;
	userName: string;
}

interface Participant {
	userId: string;
	userName: string;
}

interface ChatContextValue {
	isConnected: boolean;
	error: string | null;
	messages: ChatMessagePayload[];
	typingUsers: TypingUser[];
	participants: Participant[];
	sendMessage: (message: string) => void;
	setTyping: (isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextValue>({
	isConnected: false,
	error: null,
	messages: [],
	typingUsers: [],
	participants: [],
	sendMessage: () => {},
	setTyping: () => {},
});

export function useChatContext() {
	return useContext(ChatContext);
}

interface ChatProviderProps {
	host: string;
	room: string;
	token: string;
	children: ReactNode;
}

export function ChatProvider({ host, room, token, children }: ChatProviderProps) {
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
	const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const socketRef = useRef<PartySocket | null>(null);
	const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

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
				case "chat:message":
					setMessages((prev) => [...prev, msg.payload]);
					break;

				case "chat:history":
					setMessages(msg.payload.messages);
					break;

				case "chat:typing": {
					const { userId, userName, isTyping: typing } = msg.payload;
					const existing = typingTimers.current.get(userId);
					if (existing) clearTimeout(existing);

					if (typing) {
						setTypingUsers((prev) => {
							if (prev.some((u) => u.userId === userId)) return prev;
							return [...prev, { userId, userName }];
						});
						const timer = setTimeout(() => {
							setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
							typingTimers.current.delete(userId);
						}, 3000);
						typingTimers.current.set(userId, timer);
					} else {
						setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
					}
					break;
				}

				case "chat:user_joined":
					setParticipants((prev) => {
						if (prev.some((u) => u.userId === msg.payload.userId)) return prev;
						return [...prev, msg.payload];
					});
					break;

				case "chat:user_left":
					setParticipants((prev) => prev.filter((u) => u.userId !== msg.payload.userId));
					setTypingUsers((prev) => prev.filter((u) => u.userId !== msg.payload.userId));
					break;

				case "chat:participants":
					setParticipants(msg.payload.users);
					break;
			}
		});

		socketRef.current = socket;

		return () => {
			socket.close();
			socketRef.current = null;
			for (const timer of typingTimers.current.values()) {
				clearTimeout(timer);
			}
			typingTimers.current.clear();
		};
	}, [host, room, token]);

	const sendMessage = (message: string) => {
		socketRef.current?.send(JSON.stringify({ type: "chat:send", payload: { message } }));
	};

	const setTyping = (isTyping: boolean) => {
		socketRef.current?.send(JSON.stringify({ type: "chat:typing", payload: { isTyping } }));
	};

	return (
		<ChatContext.Provider
			value={{ isConnected, error, messages, typingUsers, participants, sendMessage, setTyping }}
		>
			{children}
		</ChatContext.Provider>
	);
}
```

---

## 9. Frontend: Feature Components

### `apps/web/features/chat/index.ts`

```ts
export { ChatLayout } from "./chat-layout";
export { ChatRoom } from "./chat-room";
```

### `apps/web/features/chat/chat-layout.tsx`

Top-level layout: sidebar + content area + dialog modals.

```tsx
"use client";

import { type ReactNode, useState } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { NewDmDialog } from "./new-dm-dialog";
import { NewRoomDialog } from "./new-room-dialog";

export function ChatLayout({
	activeRoomId,
	children,
}: {
	activeRoomId?: string;
	children: ReactNode;
}) {
	const [newRoomOpen, setNewRoomOpen] = useState(false);
	const [newDmOpen, setNewDmOpen] = useState(false);

	return (
		<div className="flex h-screen">
			<ChatSidebar
				activeRoomId={activeRoomId}
				onNewRoom={() => setNewRoomOpen(true)}
				onNewDm={() => setNewDmOpen(true)}
			/>
			<div className="flex-1">{children}</div>
			<NewRoomDialog open={newRoomOpen} onOpenChange={setNewRoomOpen} />
			<NewDmDialog open={newDmOpen} onOpenChange={setNewDmOpen} />
		</div>
	);
}
```

### `apps/web/features/chat/chat-room.tsx`

Orchestrator for a single room. Fetches the PartyKit token, renders `ChatProvider` around `ChatMessages` and `ChatInput`.

```tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ChatProvider, usePartykitToken } from "@/lib/partykit";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";

export function ChatRoom({ roomId, currentUserId }: { roomId: string; currentUserId: string }) {
	const { token, host, isLoading, error, refetch } = usePartykitToken();

	if (isLoading) {
		return (
			<div className="flex h-full flex-col gap-4 p-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="flex-1" />
				<Skeleton className="h-10" />
			</div>
		);
	}

	if (error || !token || !host) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground text-sm">{error ?? "Failed to connect"}</p>
					<button type="button" onClick={refetch} className="text-primary mt-2 text-sm underline">
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<ChatProvider host={host} room={roomId} token={token}>
			<div className="flex h-full flex-col">
				<ChatMessages roomId={roomId} currentUserId={currentUserId} />
				<ChatInput />
			</div>
		</ChatProvider>
	);
}
```

### `apps/web/features/chat/chat-messages.tsx`

Displays messages by merging historical data (from tRPC/Turso) with real-time data (from WebSocket/DO). Deduplicates by message ID.

```tsx
"use client";

import type { ChatMessagePayload } from "@repo/realtime-types";
import { useEffect, useMemo, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatContext } from "@/lib/partykit";
import { trpc } from "@/trpc/client";

function getInitials(name: string) {
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function formatTime(timestamp: number) {
	return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ msg, isOwn }: { msg: ChatMessagePayload; isOwn: boolean }) {
	return (
		<div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
			{!isOwn && (
				<Avatar size="sm">
					<AvatarFallback>{getInitials(msg.userName)}</AvatarFallback>
				</Avatar>
			)}
			<div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
				{!isOwn && <span className="text-muted-foreground text-xs">{msg.userName}</span>}
				<div
					className={`rounded-2xl px-3 py-2 text-sm ${
						isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
					}`}
				>
					{msg.message}
				</div>
				<span className="text-muted-foreground text-[10px]">{formatTime(msg.timestamp)}</span>
			</div>
		</div>
	);
}

export function ChatMessages({ roomId, currentUserId }: { roomId: string; currentUserId: string }) {
	const { messages: realtimeMessages, typingUsers } = useChatContext();
	const bottomRef = useRef<HTMLDivElement>(null);

	const { data, isLoading } = trpc.chat.messages.useQuery(
		{ roomId, limit: 50 },
		{ refetchOnWindowFocus: false },
	);

	// Merge historical (Turso) + real-time (DO) messages, dedup by ID
	const allMessages = useMemo(() => {
		const historical =
			data?.messages.map((m) => ({
				id: m.id,
				userId: m.userId,
				userName: m.userName,
				message: m.message,
				timestamp: new Date(m.createdAt).getTime(),
			})) ?? [];

		const seen = new Set(historical.map((m) => m.id));
		const merged = [...historical];
		for (const msg of realtimeMessages) {
			if (!seen.has(msg.id)) {
				merged.push(msg);
			}
		}
		return merged.sort((a, b) => a.timestamp - b.timestamp);
	}, [data?.messages, realtimeMessages]);

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		if (allMessages.length > 0) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [allMessages]);

	if (isLoading) {
		return (
			<div className="flex flex-1 flex-col gap-3 p-4">
				{["a", "b", "c", "d", "e"].map((key) => (
					<div key={key} className="flex gap-2">
						<Skeleton className="size-6 rounded-full" />
						<div className="flex flex-col gap-1">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-8 w-48 rounded-2xl" />
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<ScrollArea className="flex-1">
			<div className="flex flex-col gap-3 p-4">
				{allMessages.length === 0 && (
					<p className="text-muted-foreground py-8 text-center text-sm">
						No messages yet. Start the conversation!
					</p>
				)}
				{allMessages.map((msg) => (
					<MessageBubble key={msg.id} msg={msg} isOwn={msg.userId === currentUserId} />
				))}
				{typingUsers.length > 0 && (
					<div className="text-muted-foreground text-xs">
						{typingUsers.map((u) => u.userName).join(", ")}{" "}
						{typingUsers.length === 1 ? "is" : "are"} typing...
					</div>
				)}
				<div ref={bottomRef} />
			</div>
		</ScrollArea>
	);
}
```

### `apps/web/features/chat/chat-input.tsx`

Text input with typing indicator debounce and Enter-to-send.

```tsx
"use client";

import { SendHorizonal } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatContext } from "@/lib/partykit";

export function ChatInput() {
	const { sendMessage, setTyping, isConnected } = useChatContext();
	const [value, setValue] = useState("");
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const handleSend = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed) return;
		sendMessage(trimmed);
		setValue("");
		setTyping(false);
		clearTimeout(typingTimeoutRef.current);
	}, [value, sendMessage, setTyping]);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setValue(e.target.value);
			setTyping(true);
			clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
		},
		[setTyping],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	return (
		<div className="flex gap-2 border-t p-4">
			<Input
				value={value}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				placeholder={isConnected ? "Type a message..." : "Connecting..."}
				disabled={!isConnected}
				className="flex-1"
			/>
			<Button onClick={handleSend} disabled={!isConnected || !value.trim()} size="icon">
				<SendHorizonal className="size-4" />
			</Button>
		</div>
	);
}
```

### `apps/web/features/chat/chat-sidebar.tsx`

Left sidebar listing the user's rooms (public + DMs), browse-able public rooms, and buttons to create rooms/DMs.

```tsx
"use client";

import { Hash, MessageCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/trpc/client";

export function ChatSidebar({
	activeRoomId,
	onNewRoom,
	onNewDm,
}: {
	activeRoomId?: string;
	onNewRoom: () => void;
	onNewDm: () => void;
}) {
	const router = useRouter();
	const { data: myRooms, isLoading: roomsLoading } = trpc.chat.myRooms.useQuery();
	const { data: publicRooms } = trpc.chat.publicRooms.useQuery();

	const userRooms = myRooms ?? [];
	const publicRoomList = publicRooms ?? [];
	const dmRooms = userRooms.filter((r) => r.type === "dm");
	const myPublicRooms = userRooms.filter((r) => r.type === "public");

	// Public rooms the user hasn't joined yet
	const unjoinedPublic = publicRoomList.filter(
		(pub) => !myPublicRooms.some((my) => my.id === pub.id),
	);

	return (
		<div className="flex h-full w-64 flex-col border-r">
			<div className="flex items-center justify-between border-b p-4">
				<h2 className="text-sm font-semibold">Chat</h2>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2">
					{/* Public rooms */}
					<div className="mb-2 flex items-center justify-between px-2">
						<span className="text-muted-foreground text-xs font-medium uppercase">Rooms</span>
						<Button variant="ghost" size="icon-sm" onClick={onNewRoom}>
							<Plus className="size-3" />
						</Button>
					</div>

					{roomsLoading ? (
						<div className="space-y-1 px-2">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-full" />
						</div>
					) : (
						<>
							{myPublicRooms.map((room) => (
								<button
									key={room.id}
									type="button"
									onClick={() => router.push(`/chat/${room.id}`)}
									className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
										activeRoomId === room.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
									}`}
								>
									<Hash className="text-muted-foreground size-4 shrink-0" />
									<span className="truncate">{room.name ?? room.id}</span>
								</button>
							))}

							{unjoinedPublic.length > 0 && (
								<>
									<div className="text-muted-foreground mt-2 px-2 text-[10px] uppercase">
										Browse
									</div>
									{unjoinedPublic.map((room) => (
										<JoinableRoom key={room.id} room={room} />
									))}
								</>
							)}
						</>
					)}

					<Separator className="my-3" />

					{/* DMs */}
					<div className="mb-2 flex items-center justify-between px-2">
						<span className="text-muted-foreground text-xs font-medium uppercase">
							Direct Messages
						</span>
						<Button variant="ghost" size="icon-sm" onClick={onNewDm}>
							<Plus className="size-3" />
						</Button>
					</div>

					{roomsLoading ? (
						<div className="space-y-1 px-2">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-full" />
						</div>
					) : (
						<>
							{dmRooms.length === 0 && (
								<p className="text-muted-foreground px-2 text-xs">No conversations yet</p>
							)}
							{dmRooms.map((room) => (
								<button
									key={room.id}
									type="button"
									onClick={() => router.push(`/chat/${room.id}`)}
									className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
										activeRoomId === room.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
									}`}
								>
									<MessageCircle className="text-muted-foreground size-4 shrink-0" />
									<span className="truncate">{room.name ?? room.id.replace("dm:", "DM")}</span>
								</button>
							))}
						</>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}

function JoinableRoom({ room }: { room: { id: string; name: string | null } }) {
	const router = useRouter();
	const utils = trpc.useUtils();
	const joinRoom = trpc.chat.joinRoom.useMutation({
		onSuccess: () => {
			utils.chat.myRooms.invalidate();
			router.push(`/chat/${room.id}`);
		},
	});

	return (
		<button
			type="button"
			onClick={() => joinRoom.mutate({ roomId: room.id })}
			disabled={joinRoom.isPending}
			className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
		>
			<Hash className="text-muted-foreground size-4 shrink-0" />
			<span className="truncate opacity-60">{room.name ?? room.id}</span>
			<Badge variant="secondary" className="ml-auto text-[10px]">
				Join
			</Badge>
		</button>
	);
}
```

### `apps/web/features/chat/new-room-dialog.tsx`

Dialog for creating a new public room.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";

export function NewRoomDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [name, setName] = useState("");
	const router = useRouter();
	const utils = trpc.useUtils();

	const createRoom = trpc.chat.createRoom.useMutation({
		onSuccess: (room) => {
			utils.chat.myRooms.invalidate();
			utils.chat.publicRooms.invalidate();
			onOpenChange(false);
			setName("");
			router.push(`/chat/${room.id}`);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		createRoom.mutate({ name: trimmed });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Room</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Room name"
						maxLength={50}
					/>
					<DialogFooter className="mt-4">
						<Button type="submit" disabled={!name.trim() || createRoom.isPending}>
							{createRoom.isPending ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

### `apps/web/features/chat/new-dm-dialog.tsx`

Dialog for starting a new direct message by entering a user ID.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";

export function NewDmDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [userId, setUserId] = useState("");
	const router = useRouter();
	const utils = trpc.useUtils();

	const createDm = trpc.chat.getOrCreateDm.useMutation({
		onSuccess: (room) => {
			utils.chat.myRooms.invalidate();
			onOpenChange(false);
			setUserId("");
			router.push(`/chat/${room.id}`);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = userId.trim();
		if (!trimmed) return;
		createDm.mutate({ otherUserId: trimmed });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New Direct Message</DialogTitle>
					<DialogDescription>
						Enter the user ID of the person you want to message.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" />
					{createDm.error && <p className="mt-1 text-sm text-red-500">{createDm.error.message}</p>}
					<DialogFooter className="mt-4">
						<Button type="submit" disabled={!userId.trim() || createDm.isPending}>
							{createDm.isPending ? "Creating..." : "Start Chat"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

---

## 10. Frontend: App Router Pages

### `apps/web/app/chat/layout.tsx`

Server component that guards the entire `/chat` route tree behind authentication.

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
	const session = await getSession();
	if (!session?.user) {
		redirect("/login");
	}
	return <>{children}</>;
}
```

### `apps/web/app/chat/page.tsx`

Landing page shown when no room is selected.

```tsx
"use client";

import { MessageCircle } from "lucide-react";
import { ChatLayout } from "@/features/chat";

export default function ChatPage() {
	return (
		<ChatLayout>
			<div className="flex h-full items-center justify-center">
				<div className="text-center">
					<MessageCircle className="text-muted-foreground mx-auto mb-4 size-12" />
					<h2 className="text-lg font-medium">Select a conversation</h2>
					<p className="text-muted-foreground text-sm">Choose a room or start a new conversation</p>
				</div>
			</div>
		</ChatLayout>
	);
}
```

### `apps/web/app/chat/[roomId]/page.tsx`

Server component for a specific room. Reads session and roomId, then hands off to the client component.

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { ChatRoomPageClient } from "./client";

export default async function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
	const [session, { roomId }] = await Promise.all([getSession(), params]);
	if (!session?.user) {
		redirect("/login");
	}

	return <ChatRoomPageClient roomId={roomId} currentUserId={session.user.id} />;
}
```

### `apps/web/app/chat/[roomId]/client.tsx`

Client component that composes `ChatLayout` (with active room highlighted) and `ChatRoom`.

```tsx
"use client";

import { ChatLayout, ChatRoom } from "@/features/chat";

export function ChatRoomPageClient({
	roomId,
	currentUserId,
}: {
	roomId: string;
	currentUserId: string;
}) {
	return (
		<ChatLayout activeRoomId={roomId}>
			<ChatRoom roomId={roomId} currentUserId={currentUserId} />
		</ChatLayout>
	);
}
```

---

## 11. DM Room ID Convention

Direct message rooms use a deterministic ID derived from both user IDs:

```
dm:<sorted-user-id-A>:<sorted-user-id-B>
```

The `getDmRoomId` helper (from `@repo/realtime-types`) sorts the two user IDs alphabetically so the same pair always produces the same room ID regardless of who initiates:

```ts
export function getDmRoomId(userA: string, userB: string): string {
	return `dm:${[userA, userB].sort().join(":")}`;
}
```

Example: users `user_abc` and `user_xyz` always get room ID `dm:user_abc:user_xyz`.

This convention is used in three places:
1. `chatRepository.findDmRoom()` -- constructs the ID to look up the room
2. `chatRouter.getOrCreateDm` -- constructs the ID when creating a DM room
3. `ChatSidebar` -- detects DM rooms by checking `r.type === "dm"` and strips the `dm:` prefix for display

---

## 12. Persistence Flow

Messages flow through a three-tier storage pipeline:

```
1. User sends message via WebSocket
       |
       v
2. PartyKit DO broadcasts to all connected clients (instant)
       |
       v
3. PartyKit DO stores in Durable Object storage (last 100 messages)
   Key: "messages" -> ChatMessagePayload[]
       |
       v
4. PartyKit DO calls POST /api/chat/persist (fire-and-forget)
   Auth: Bearer <PARTYKIT_API_SECRET>
       |
       v
5. Next.js API route writes to Turso (permanent storage)
   chatRepository.createMessage(...)
```

### Why three tiers?

| Tier | Purpose | Durability | Speed |
|---|---|---|---|
| WebSocket broadcast | Instant delivery to connected clients | None (ephemeral) | ~50ms |
| DO storage | Fast history for reconnecting clients (last 100) | Survives DO restarts, not permanent | ~5ms |
| Turso (SQLite) | Permanent message archive, cursor pagination | Full durability | ~20-100ms |

### Message merge in the UI

When a user opens a chat room, two data sources load simultaneously:

1. **Historical messages** via `trpc.chat.messages.useQuery()` (from Turso, DESC order, limit 50)
2. **Real-time messages** via `useChatContext().messages` (from WebSocket, includes DO history on connect)

The `ChatMessages` component merges them using a `useMemo`:

1. Convert historical messages to `ChatMessagePayload` format
2. Build a `Set` of historical message IDs
3. Append any real-time messages whose IDs are not in the set
4. Sort all messages by `timestamp` ascending

This deduplication ensures that messages already persisted to Turso (and returned by the tRPC query) are not shown twice when they also arrive through the WebSocket.

---

## 13. Environment Variables

### Next.js (`apps/web/.env.local`)

| Variable | Description |
|---|---|
| `PARTYKIT_JWT_SECRET` | Shared secret for signing/verifying JWTs (same as PartyKit's `JWT_SECRET`) |
| `PARTYKIT_HOST` | PartyKit server hostname (e.g., `t4-app.username.partykit.dev`) |
| `PARTYKIT_API_SECRET` | Shared secret for PartyKit -> Next.js server-to-server auth |

### PartyKit (`apps/partykit`)

| Variable | Description |
|---|---|
| `JWT_SECRET` | Same as Next.js `PARTYKIT_JWT_SECRET` |
| `NEXT_API_URL` | Base URL of the Next.js app |
| `API_SECRET` | Same as Next.js `PARTYKIT_API_SECRET` |

---

## File Index

| File | Layer | Purpose |
|---|---|---|
| `packages/realtime-types/src/auth.ts` | Shared types | JWT payload Zod schema |
| `packages/realtime-types/src/chat.ts` | Shared types | Client/server message schemas, `getDmRoomId` |
| `apps/web/db/schema/chat.ts` | Database | Drizzle table definitions |
| `apps/web/db/repositories/chat.ts` | Database | CRUD operations for rooms, participants, messages |
| `apps/web/trpc/routers/chat.ts` | API | tRPC router with auth-gated queries/mutations |
| `apps/web/app/api/chat/persist/route.ts` | API | POST endpoint for PartyKit to persist messages |
| `apps/web/app/api/partykit/token/route.ts` | API | GET endpoint to mint JWT for WebSocket auth |
| `apps/partykit/src/lib/auth.ts` | PartyKit server | JWT verification helpers |
| `apps/partykit/src/parties/chat.ts` | PartyKit server | Chat Durable Object (WS handler) |
| `apps/partykit/partykit.json` | PartyKit config | Entry point and compatibility date |
| `apps/web/lib/partykit/index.ts` | Frontend lib | Re-exports |
| `apps/web/lib/partykit/use-partykit-token.ts` | Frontend lib | Token fetch + auto-refresh hook |
| `apps/web/lib/partykit/provider.tsx` | Frontend lib | `ChatProvider` context + `PartySocket` management |
| `apps/web/features/chat/index.ts` | Frontend feature | Re-exports |
| `apps/web/features/chat/chat-layout.tsx` | Frontend feature | Sidebar + content layout shell |
| `apps/web/features/chat/chat-room.tsx` | Frontend feature | Room orchestrator (token + provider) |
| `apps/web/features/chat/chat-messages.tsx` | Frontend feature | Message list with merge + dedup logic |
| `apps/web/features/chat/chat-input.tsx` | Frontend feature | Input with typing indicator debounce |
| `apps/web/features/chat/chat-sidebar.tsx` | Frontend feature | Room list sidebar |
| `apps/web/features/chat/new-room-dialog.tsx` | Frontend feature | Create public room dialog |
| `apps/web/features/chat/new-dm-dialog.tsx` | Frontend feature | Start DM dialog |
| `apps/web/app/chat/layout.tsx` | App Router | Auth guard for `/chat/*` |
| `apps/web/app/chat/page.tsx` | App Router | Empty state landing page |
| `apps/web/app/chat/[roomId]/page.tsx` | App Router | Server component for room page |
| `apps/web/app/chat/[roomId]/client.tsx` | App Router | Client component composing layout + room |
