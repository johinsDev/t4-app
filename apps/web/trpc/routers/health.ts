import { client } from "@/db";
import { baseProcedure, createTRPCRouter } from "../init";

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
