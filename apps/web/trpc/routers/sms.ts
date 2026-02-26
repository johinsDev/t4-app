import { z } from "zod";
import {
	e164PhoneSchema,
	getPreview,
	listPreviews,
	SMSManager,
	smsContentSchema,
	smsSegmentInfo,
} from "@/lib/sms";
import { baseProcedure, createTRPCRouter } from "../init";

const manager = new SMSManager({
	default: "json",
	config: {
		json: { provider: "json" as const },
	},
});

export const smsRouter = createTRPCRouter({
	sendTest: baseProcedure
		.input(
			z.object({
				to: e164PhoneSchema,
				content: smsContentSchema,
			}),
		)
		.mutation(async ({ input }) => {
			const response = await manager.send((m) => {
				m.to(input.to).content(input.content);
			});
			return response;
		}),

	segmentInfo: baseProcedure.input(z.object({ text: z.string().min(1) })).query(({ input }) => {
		return smsSegmentInfo(input.text);
	}),

	listPreviews: baseProcedure.query(() => {
		return listPreviews();
	}),

	getPreview: baseProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
		return getPreview(input.id);
	}),
});
