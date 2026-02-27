import { render } from "@react-email/render";
import { z } from "zod";
import WelcomeEmail from "@/emails/welcome";
import {
	emailAddressSchema,
	emailContentSchema,
	emailManager,
	emailSubjectSchema,
	getPreview,
	listPreviews,
} from "@/lib/email";
import { baseProcedure, createTRPCRouter } from "../init";

export const emailRouter = createTRPCRouter({
	sendTest: baseProcedure
		.input(
			z.object({
				to: emailAddressSchema,
				subject: emailSubjectSchema,
				html: emailContentSchema,
			}),
		)
		.mutation(async ({ input }) => {
			const response = await emailManager.send((m) => {
				m.to(input.to).subject(input.subject).html(input.html);
			});
			return response;
		}),

	sendWelcome: baseProcedure
		.input(
			z.object({
				to: emailAddressSchema,
				name: z.string().min(1, "Name is required"),
			}),
		)
		.mutation(async ({ input }) => {
			const html = await render(WelcomeEmail({ name: input.name }));
			const response = await emailManager.send((m) => {
				m.to(input.to).subject("Welcome to T4 App!").html(html);
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
