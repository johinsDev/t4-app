"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Value } from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PhoneInput } from "@/components/ui/phone-input";
import { authClient } from "@/lib/auth-client";

const phoneSchema = z.object({
	phone: z
		.string()
		.min(1, "Phone number is required")
		.refine(isValidPhoneNumber, "Invalid phone number"),
});

const otpSchema = z.object({
	code: z.string().length(6, "Code must be 6 digits"),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

export function PhoneOtpForm() {
	const [step, setStep] = useState<"phone" | "otp">("phone");
	const [phone, setPhone] = useState<Value>("" as Value);

	const phoneForm = useForm<PhoneFormValues>({
		resolver: zodResolver(phoneSchema),
		defaultValues: { phone: "" },
	});

	const otpForm = useForm<OtpFormValues>({
		resolver: zodResolver(otpSchema),
		defaultValues: { code: "" },
	});

	async function handleSendCode(data: PhoneFormValues) {
		const { error } = await authClient.phoneNumber.sendOtp({
			phoneNumber: data.phone,
		});

		if (error) {
			toast.error(error.message ?? "Failed to send code");
			return;
		}
		setStep("otp");
	}

	async function handleVerify(data: OtpFormValues) {
		const { error } = await authClient.phoneNumber.verify({
			phoneNumber: phone,
			code: data.code,
		});

		if (error) {
			toast.error(error.message ?? "Invalid code");
			return;
		}
		window.location.href = "/";
	}

	if (step === "otp") {
		return (
			<form onSubmit={otpForm.handleSubmit(handleVerify)} className="space-y-4">
				<Field>
					<FieldLabel>Verification Code</FieldLabel>
					<InputOTP
						maxLength={6}
						value={otpForm.watch("code")}
						onChange={(value) => otpForm.setValue("code", value, { shouldValidate: true })}
					>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
							<InputOTPSlot index={5} />
						</InputOTPGroup>
					</InputOTP>
					<FieldError>{otpForm.formState.errors.code?.message}</FieldError>
				</Field>
				<Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
					{otpForm.formState.isSubmitting ? "Verifying..." : "Verify"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="w-full"
					onClick={() => {
						setStep("phone");
						otpForm.reset();
					}}
				>
					Use a different number
				</Button>
			</form>
		);
	}

	return (
		<form onSubmit={phoneForm.handleSubmit(handleSendCode)} className="space-y-4">
			<Field data-invalid={!!phoneForm.formState.errors.phone}>
				<FieldLabel>Phone Number</FieldLabel>
				<PhoneInput
					defaultCountry="CO"
					international
					value={phone}
					onChange={(value) => {
						setPhone(value);
						phoneForm.setValue("phone", value ?? "", { shouldValidate: true });
					}}
					placeholder="Enter phone number"
				/>
				<FieldError>{phoneForm.formState.errors.phone?.message}</FieldError>
			</Field>
			<Button type="submit" className="w-full" disabled={phoneForm.formState.isSubmitting}>
				{phoneForm.formState.isSubmitting ? "Sending..." : "Send Code"}
			</Button>
		</form>
	);
}
