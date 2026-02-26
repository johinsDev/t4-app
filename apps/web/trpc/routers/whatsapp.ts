import { z } from "zod";
import {
	e164PhoneSchema,
	getPreview,
	listPreviews,
	whatsappContentSchema,
	whatsappManager,
} from "@/lib/whatsapp";
import { baseProcedure, createTRPCRouter } from "../init";

export const whatsappRouter = createTRPCRouter({
	sendTest: baseProcedure
		.input(
			z.object({
				to: e164PhoneSchema,
				content: whatsappContentSchema,
			}),
		)
		.mutation(async ({ input }) => {
			const response = await whatsappManager.send((m) => {
				m.to(input.to).content(input.content);
			});
			return response;
		}),

	listPreviews: baseProcedure.query(() => {
		return listPreviews();
	}),

	getPreview: baseProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
		return getPreview(input.id);
	}),
});
