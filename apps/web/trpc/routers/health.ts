import { client } from "@/db";
import { env } from "@/env";
import { cacheManager } from "@/lib/cache";
import { rateLimitManager } from "@/lib/rate-limit";
import { createTRPCRouter, publicQuery } from "../init";

async function measure<T>(fn: () => Promise<T>) {
	const start = performance.now();
	try {
		const result = await fn();
		return { result, latencyMs: Math.round(performance.now() - start), error: null };
	} catch (e) {
		return {
			result: null,
			latencyMs: Math.round(performance.now() - start),
			error: e instanceof Error ? e.message : "Unknown error",
		};
	}
}

export const healthRouter = createTRPCRouter({
	cache: publicQuery.query(async () => {
		const store = cacheManager.use();
		const { latencyMs, error } = await measure(async () => {
			await store.set("health:ping", "ok");
			const value = await store.get("health:ping");
			if (value !== "ok") throw new Error("Cache read/write mismatch");
			await store.delete("health:ping");
		});
		return {
			name: "Cache" as const,
			provider: store.name,
			status: error ? ("error" as const) : ("ok" as const),
			latencyMs,
			error,
			timestamp: new Date().toISOString(),
		};
	}),

	db: publicQuery.query(async () => {
		const provider = env.DATABASE_URL.startsWith("file:") ? "sqlite" : "turso";
		const { latencyMs, error } = await measure(() => client.execute("SELECT 1"));
		return {
			name: "Database" as const,
			provider,
			status: error ? ("error" as const) : ("ok" as const),
			latencyMs,
			error,
			timestamp: new Date().toISOString(),
		};
	}),

	sms: publicQuery.query(() => {
		return {
			name: "SMS" as const,
			provider: env.SMS_PROVIDER,
			status: "ok" as const,
			latencyMs: 0,
			error: null,
			timestamp: new Date().toISOString(),
		};
	}),

	whatsapp: publicQuery.query(() => {
		return {
			name: "WhatsApp" as const,
			provider: env.WHATSAPP_PROVIDER,
			status: "ok" as const,
			latencyMs: 0,
			error: null,
			timestamp: new Date().toISOString(),
		};
	}),

	email: publicQuery.query(() => {
		return {
			name: "Email" as const,
			provider: env.EMAIL_PROVIDER,
			status: "ok" as const,
			latencyMs: 0,
			error: null,
			timestamp: new Date().toISOString(),
		};
	}),

	rateLimit: publicQuery.query(async () => {
		const store = rateLimitManager.use();
		const { latencyMs, error } = await measure(async () => {
			const result = await store.limit("health:ping", { limit: 1000, window: "60s" });
			if (!result.success) throw new Error("Rate limit check failed");
		});
		return {
			name: "Rate Limit" as const,
			provider: store.name,
			status: error ? ("error" as const) : ("ok" as const),
			latencyMs,
			error,
			timestamp: new Date().toISOString(),
		};
	}),

	all: publicQuery.query(async () => {
		const store = cacheManager.use();
		const rlStore = rateLimitManager.use();
		const checks = await Promise.allSettled([
			(async () => {
				const provider = env.DATABASE_URL.startsWith("file:") ? "sqlite" : "turso";
				const { latencyMs, error } = await measure(() => client.execute("SELECT 1"));
				return {
					name: "Database" as const,
					provider,
					status: error ? ("error" as const) : ("ok" as const),
					latencyMs,
					error,
					timestamp: new Date().toISOString(),
				};
			})(),
			(async () => {
				const { latencyMs, error } = await measure(async () => {
					await store.set("health:ping", "ok");
					const value = await store.get("health:ping");
					if (value !== "ok") throw new Error("Cache read/write mismatch");
					await store.delete("health:ping");
				});
				return {
					name: "Cache" as const,
					provider: store.name,
					status: error ? ("error" as const) : ("ok" as const),
					latencyMs,
					error,
					timestamp: new Date().toISOString(),
				};
			})(),
			(async () => {
				const { latencyMs, error } = await measure(async () => {
					const result = await rlStore.limit("health:ping", {
						limit: 1000,
						window: "60s",
					});
					if (!result.success) throw new Error("Rate limit check failed");
				});
				return {
					name: "Rate Limit" as const,
					provider: rlStore.name,
					status: error ? ("error" as const) : ("ok" as const),
					latencyMs,
					error,
					timestamp: new Date().toISOString(),
				};
			})(),
			Promise.resolve({
				name: "SMS" as const,
				provider: env.SMS_PROVIDER,
				status: "ok" as const,
				latencyMs: 0,
				error: null,
				timestamp: new Date().toISOString(),
			}),
			Promise.resolve({
				name: "WhatsApp" as const,
				provider: env.WHATSAPP_PROVIDER,
				status: "ok" as const,
				latencyMs: 0,
				error: null,
				timestamp: new Date().toISOString(),
			}),
			Promise.resolve({
				name: "Email" as const,
				provider: env.EMAIL_PROVIDER,
				status: "ok" as const,
				latencyMs: 0,
				error: null,
				timestamp: new Date().toISOString(),
			}),
		]);

		return checks.map((result) =>
			result.status === "fulfilled"
				? result.value
				: {
						name: "Unknown" as const,
						status: "error" as const,
						latencyMs: 0,
						error: result.reason instanceof Error ? result.reason.message : "Unknown error",
						timestamp: new Date().toISOString(),
					},
		);
	}),
});
