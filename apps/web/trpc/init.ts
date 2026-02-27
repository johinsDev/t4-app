import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { db } from "@/db";
import { auth, type Session } from "@/lib/auth";
import { rateLimitManager } from "@/lib/rate-limit";

export const createTRPCContext = cache(async (opts?: { headers?: Headers }) => {
	const session = opts?.headers ? await auth.api.getSession({ headers: opts.headers }) : null;
	return { db, session, headers: opts?.headers };
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

const createRateLimitMiddleware = (ruleKey: string) =>
	t.middleware(async ({ ctx, path, next }) => {
		const ip =
			ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
			ctx.headers?.get("x-real-ip") ??
			"127.0.0.1";
		const key = `${ip}:${path}`;
		const result = await rateLimitManager.limit(key, ruleKey);

		if (!result.success) {
			throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
		}

		return next();
	});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure.use(loggingMiddleware);
export const authedProcedure = baseProcedure.use(authMiddleware);
export const publicQuery = baseProcedure.use(createRateLimitMiddleware("api/trpc:query"));
export const publicMutation = baseProcedure.use(createRateLimitMiddleware("api/trpc:mutation"));
export const protectedQuery = authedProcedure.use(createRateLimitMiddleware("api/trpc:query"));
export const protectedMutation = authedProcedure.use(
	createRateLimitMiddleware("api/trpc:mutation"),
);
