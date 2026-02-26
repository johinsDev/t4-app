import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { db } from "@/db";
import { auth, type Session } from "@/lib/auth";

export const createTRPCContext = cache(async (opts?: { headers?: Headers }) => {
	const session = opts?.headers ? await auth.api.getSession({ headers: opts.headers }) : null;
	return { db, session };
});

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

export const t = initTRPC.context<Context>().create();

const loggingMiddleware = t.middleware(async ({ path, type, next }) => {
	const start = performance.now();
	const result = await next();
	const duration = Math.round(performance.now() - start);
	console.log(`[trpc] ${type} ${path} — ${duration}ms`);
	return result;
});

const authMiddleware = t.middleware(async ({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({ ctx: { session: ctx.session as Session } });
});

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const hits = new Map<string, number[]>();

const rateLimitMiddleware = t.middleware(async ({ ctx, path, next }) => {
	const userId = ctx.session?.user?.id ?? "anon";
	const key = `${userId}:${path}`;
	const now = Date.now();

	const timestamps = hits.get(key) ?? [];
	const windowStart = now - WINDOW_MS;
	const recent = timestamps.filter((ts) => ts > windowStart);

	if (recent.length >= MAX_REQUESTS) {
		throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
	}

	recent.push(now);
	hits.set(key, recent);

	return next();
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure.use(loggingMiddleware);
export const authedProcedure = baseProcedure.use(authMiddleware);
export const rateLimitedProcedure = baseProcedure.use(rateLimitMiddleware);
