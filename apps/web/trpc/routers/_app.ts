import { z } from "zod";
import { client } from "@/db";
import { baseProcedure, createTRPCRouter } from "../init";

const dbRouter = createTRPCRouter({
	health: baseProcedure.query(async () => {
		const result = await client.execute("SELECT 1");
		return { status: "ok" as const, timestamp: new Date().toISOString(), rows: result.rows.length };
	}),
});

export const appRouter = createTRPCRouter({
	hello: baseProcedure.input(z.object({ text: z.string() })).query(({ input }) => {
		return { greeting: `hello ${input.text}` };
	}),
	db: dbRouter,
});

export type AppRouter = typeof appRouter;
