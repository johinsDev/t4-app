import { z } from "zod";

import { getCache } from "../../lib/cache";
import { baseProcedure, createTRPCRouter } from "../init";

export const appRouter = createTRPCRouter({
	hello: baseProcedure.input(z.object({ text: z.string() })).query(({ input }) => {
		return { greeting: `hello ${input.text}` };
	}),

	health: baseProcedure.query(async () => {
		const cache = getCache();
		await cache.set("test", "working");
		const value = await cache.get("test");
		return value;
	}),
});

export type AppRouter = typeof appRouter;
