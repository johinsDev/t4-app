import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
	project: process.env.TRIGGER_PROJECT_ID ?? "proj_pwqxhdhrlurljnctiqdz",
	dirs: ["./trigger"],
	maxDuration: 300,
	retries: {
		enabledInDev: false,
		default: {
			maxAttempts: 3,
			factor: 2,
			minTimeoutInMs: 1000,
			maxTimeoutInMs: 30000,
			randomize: true,
		},
	},
});
