import { z } from "zod";
import {
	e164PhoneSchema,
	getPreview,
	listPreviews,
	smsContentSchema,
	smsManager,
	smsSegmentInfo,
} from "@/lib/sms";
import { createTRPCRouter, publicMutation, publicQuery } from "../init";

export const smsRouter = createTRPCRouter({
	sendTest: publicMutation
		.input(
			z.object({
				to: e164PhoneSchema,
				content: smsContentSchema,
			}),
		)
		.mutation(async ({ input }) => {
			const response = await smsManager.send((m) => {
				m.to(input.to).content(input.content);
			});
			return response;
		}),

	segmentInfo: publicQuery.input(z.object({ text: z.string().min(1) })).query(({ input }) => {
		return smsSegmentInfo(input.text);
	}),

	listPreviews: publicQuery.query(() => {
		return listPreviews();
	}),

	getPreview: publicQuery.input(z.object({ id: z.string() })).query(({ input }) => {
		return getPreview(input.id);
	}),
});
