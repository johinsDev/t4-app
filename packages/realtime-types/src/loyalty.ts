import { z } from "zod";

// ── Store loyalty mode ──

export const loyaltyModeSchema = z.enum(["points", "labels"]);
export type LoyaltyMode = z.infer<typeof loyaltyModeSchema>;

// ── Client → Server messages ──

export const clientMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("loyalty:add_purchase"),
		payload: z.object({
			targetUserId: z.string(),
			amount: z.number().min(1).optional(), // points to add (points mode)
			label: z.string().optional(), // label to add (labels mode)
		}),
	}),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

// ── Server → Client messages ──

export const loyaltyStatusSchema = z.object({
	mode: loyaltyModeSchema,
	points: z.number(),
	labels: z.array(z.string()),
});

export type LoyaltyStatus = z.infer<typeof loyaltyStatusSchema>;

export const serverMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("loyalty:status"),
		payload: loyaltyStatusSchema,
	}),
	z.object({
		type: z.literal("loyalty:purchase_added"),
		payload: z.object({
			addedBy: z.string(),
			amount: z.number().optional(),
			label: z.string().optional(),
			newTotal: z.number(),
			timestamp: z.number(),
		}),
	}),
	z.object({
		type: z.literal("error"),
		payload: z.object({ code: z.string(), message: z.string() }),
	}),
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;
