import { client } from "@/db";
import { CacheManager } from "@/lib/cache";
import { baseProcedure, createTRPCRouter } from "../init";

const cache = new CacheManager({
	default: "memory",
	stores: {
		memory: { provider: "memory" as const },
	},
});

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
	cache: baseProcedure.query(async () => {
		const store = cache.use();
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

	db: baseProcedure.query(async () => {
		const { latencyMs, error } = await measure(() => client.execute("SELECT 1"));
		return {
			name: "Database" as const,
			status: error ? ("error" as const) : ("ok" as const),
			latencyMs,
			error,
			timestamp: new Date().toISOString(),
		};
	}),

	all: baseProcedure.query(async () => {
		const store = cache.use();
		const checks = await Promise.allSettled([
			(async () => {
				const { latencyMs, error } = await measure(() => client.execute("SELECT 1"));
				return {
					name: "Database" as const,
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
