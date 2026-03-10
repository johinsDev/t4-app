import { ne } from "drizzle-orm";
import { user } from "@/db/schema";
import { createTRPCRouter, protectedQuery } from "../init";

export const loyaltyRouter = createTRPCRouter({
	getStatus: protectedQuery.query(() => {
		// Hardcoded for now — will come from DB later
		return {
			mode: "points" as const,
			points: 150,
			labels: ["coffee", "coffee", "sandwich", "coffee", "pastry"],
		};
	}),

	/** List all users except the current one (for cashier client picker) */
	clients: protectedQuery.query(async ({ ctx }) => {
		const clients = await ctx.db
			.select({ id: user.id, name: user.name })
			.from(user)
			.where(ne(user.id, ctx.session.user.id));
		return clients;
	}),
});
