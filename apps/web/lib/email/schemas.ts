import { z } from "zod";

export const emailAddressSchema = z.string().email("Invalid email address");

export const emailSubjectSchema = z
	.string()
	.min(1, "Email subject cannot be empty")
	.max(998, "Email subject cannot exceed 998 characters (RFC 2822)");

export const emailContentSchema = z.string().min(1, "Email content cannot be empty");
