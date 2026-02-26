import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "../init";
import { healthRouter } from "./health";
import { smsRouter } from "./sms";

export const appRouter = createTRPCRouter({
	hello: baseProcedure.input(z.object({ text: z.string() })).query(({ input }) => {
		return { greeting: `hello ${input.text}` };
	}),
	health: healthRouter,
	sms: smsRouter,
});

export type AppRouter = typeof appRouter;
