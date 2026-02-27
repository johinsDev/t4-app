import { z } from "zod";

import { createTRPCRouter, publicQuery } from "../init";
import { emailRouter } from "./email";
import { healthRouter } from "./health";
import { smsRouter } from "./sms";
import { whatsappRouter } from "./whatsapp";

export const appRouter = createTRPCRouter({
	hello: publicQuery.input(z.object({ text: z.string() })).query(({ input }) => {
		return { greeting: `hello ${input.text}` };
	}),
	health: healthRouter,
	sms: smsRouter,
	whatsapp: whatsappRouter,
	email: emailRouter,
});

export type AppRouter = typeof appRouter;
