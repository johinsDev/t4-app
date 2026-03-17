import { z } from "zod";
import { storageManager } from "@/lib/storage";
import { createTRPCRouter, protectedMutation, protectedQuery } from "../init";

export const storageRouter = createTRPCRouter({
	createUploadUrl: protectedMutation
		.input(
			z.object({
				key: z.string().min(1),
				contentType: z.string().min(1),
				disk: z.string().optional(),
				maxSize: z.number().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const disk = storageManager.use(input.disk);
			const url = await disk.putSignedUrl(input.key, {
				contentType: input.contentType,
				maxSize: input.maxSize,
			});
			return { url, key: input.key };
		}),

	createDownloadUrl: protectedQuery
		.input(
			z.object({
				key: z.string().min(1),
				disk: z.string().optional(),
				expiresIn: z.number().optional(),
			}),
		)
		.query(async ({ input }) => {
			const disk = storageManager.use(input.disk);
			const url = await disk.getDownloadUrl(input.key, input.expiresIn);
			return { url, key: input.key };
		}),

	list: protectedQuery
		.input(
			z.object({
				prefix: z.string().optional(),
				cursor: z.string().optional(),
				limit: z.number().optional(),
				disk: z.string().optional(),
			}),
		)
		.query(async ({ input }) => {
			const disk = storageManager.use(input.disk);
			return disk.list(input.prefix, input.cursor, input.limit);
		}),

	delete: protectedMutation
		.input(
			z.object({
				key: z.string().min(1),
				disk: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const disk = storageManager.use(input.disk);
			await disk.delete(input.key);
			return { success: true };
		}),
});
