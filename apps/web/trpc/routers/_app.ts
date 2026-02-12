import { Redis } from "@upstash/redis";
import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";

const redis = Redis.fromEnv();

export const appRouter = createTRPCRouter({
	hello: baseProcedure.input(z.object({ text: z.string() })).query(({ input }) => {
		return { greeting: `hello ${input.text}` };
	}),

	testRedis: baseProcedure.query(async () => {
		await redis.set("test", "working");
		const value = await redis.get("test");

		return { redis: value };
	}),
});

export type AppRouter = typeof appRouter;
