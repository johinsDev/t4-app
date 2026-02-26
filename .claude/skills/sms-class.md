# SMS Class Generator

Generate SMS notification classes that extend `BaseSms` from the SMS library.

## When to use

When the user asks to create a new SMS notification class (e.g., "create an SMS for order confirmation", "write an OTP SMS class").

## Structure

All SMS classes live in `apps/web/lib/sms/messages/` and follow this pattern:

```ts
import { BaseSms } from "@/lib/sms";

export class OrderConfirmationSms extends BaseSms {
	readonly #orderId: string;

	constructor(orderId: string) {
		super();
		this.#orderId = orderId;
	}

	prepare() {
		// Set recipient, content, and optionally sender
		this.message
			.to("+1234567890") // Replace with actual recipient lookup
			.content(`Your order #${this.#orderId} has been confirmed. Thank you for your purchase!`);
	}
}
```

## Rules

1. Class name should be PascalCase ending in `Sms` (e.g., `WelcomeSms`, `OtpVerificationSms`)
2. Accept required data via constructor parameters, store as private fields
3. `prepare()` can be async if it needs to fetch data (e.g., from DB)
4. Always validate phone numbers are E.164 format — the `message.to()` method handles this
5. Keep SMS content concise — 160 chars fits in 1 GSM-7 segment
6. Use `this.message.from()` only if overriding the provider's default sender

## Usage example

```ts
import { SMSManager } from "@/lib/sms";
import { OrderConfirmationSms } from "@/lib/sms/messages/order-confirmation";

// Send immediately
const sms = new OrderConfirmationSms("ORD-123");
const response = await sms.send(manager);

// Queue for later (returns serializable job)
const job = await sms.sendLater(manager);

// Send with specific provider
const response = await sms.send(manager, "twilio");
```

## Async prepare example

```ts
import { BaseSms } from "@/lib/sms";
import { db } from "@/db";

export class AppointmentReminderSms extends BaseSms {
	readonly #appointmentId: string;

	constructor(appointmentId: string) {
		super();
		this.#appointmentId = appointmentId;
	}

	async prepare() {
		const appointment = await db.query.appointments.findFirst({
			where: (t, { eq }) => eq(t.id, this.#appointmentId),
			with: { patient: true },
		});
		if (!appointment) throw new Error("Appointment not found");

		this.message
			.to(appointment.patient.phone)
			.content(
				`Reminder: You have an appointment on ${appointment.date}. Reply CONFIRM to confirm.`,
			);
	}
}
```
