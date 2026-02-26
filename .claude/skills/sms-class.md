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

## Usage

```ts
import { SMSManager } from "@/lib/sms";
import { OrderConfirmationSms } from "@/lib/sms/messages/order-confirmation";

const manager = new SMSManager({
	default: "json",
	mailers: { json: { provider: "json" } },
});

// Class style — manager detects BaseSms and calls sms.send(sender)
await manager.send(new OrderConfirmationSms("ORD-123"));

// Callback style — inline message composition
await manager.send((m) => m.to("+1234567890").content("Your order is confirmed!"));

// Specific mailer
await manager.use("twilio").send(new OrderConfirmationSms("ORD-123"));
```

## shouldSend() guard

Override `shouldSend()` to conditionally skip sending. This is checked in your queue handler (e.g., Trigger.dev) before calling send:

```ts
import { BaseSms } from "@/lib/sms";
import { db } from "@/db";

export class OrderShippedSms extends BaseSms {
	readonly #orderId: string;
	readonly #phone: string;

	constructor(orderId: string, phone: string) {
		super();
		this.#orderId = orderId;
		this.#phone = phone;
	}

	async shouldSend(): Promise<boolean> {
		const order = await db.query.orders.findFirst({
			where: (t, { eq }) => eq(t.id, this.#orderId),
		});
		return order?.status === "shipped";
	}

	prepare() {
		this.message
			.to(this.#phone)
			.content(`Your order #${this.#orderId} has been shipped!`);
	}
}
```

## Queue integration (Trigger.dev)

The library does not include a queue. Use Trigger.dev (or any queue) directly:

```ts
// trigger/tasks/send-sms.ts
import { task, AbortTaskRunError } from "@trigger.dev/sdk/v3";
import { smsManager } from "@/lib/sms/config";
import { OrderShippedSms } from "@/lib/sms/messages/order-shipped";

export const sendOrderShippedSms = task({
	id: "send-order-shipped-sms",
	retry: { maxAttempts: 5, factor: 2 },
	run: async ({ orderId, phone }: { orderId: string; phone: string }) => {
		const sms = new OrderShippedSms(orderId, phone);

		if (!(await sms.shouldSend())) {
			throw new AbortTaskRunError("Skipped by shouldSend()");
		}

		return await smsManager.send(sms);
	},
});
```

Then enqueue from your app:

```ts
await sendOrderShippedSms.trigger({ orderId: "ORD-123", phone: "+1234567890" });
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

## Testing with FakeSender

```ts
import { FakeSender } from "@/lib/sms";
import { OrderShippedSms } from "@/lib/sms/messages/order-shipped";

// Enable fake mode — all sends go through the fake sender
const fake = smsManager.fake();

// ... run code that sends SMS ...
await smsManager.send(new OrderShippedSms("ORD-123", "+1234567890"));

// Assert on captured messages
fake.assertSent(OrderShippedSms);
fake.assertSentCount(1);
fake.assertNotSent(AppointmentReminderSms);

// Restore normal mode
smsManager.restore();
```
