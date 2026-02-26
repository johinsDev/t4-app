# WhatsApp Class Generator

Generate WhatsApp notification classes that extend `BaseWhatsApp` from the WhatsApp library.

## When to use

When the user asks to create a new WhatsApp notification class (e.g., "create a WhatsApp message for OTP verification", "write a welcome WhatsApp class").

## Structure

All WhatsApp classes live in `apps/web/lib/whatsapp/messages/` and follow this pattern:

```ts
import { BaseWhatsApp } from "@/lib/whatsapp";

export class OtpWhatsApp extends BaseWhatsApp {
	readonly #phone: string;
	readonly #code: string;

	constructor(phone: string, code: string) {
		super();
		this.#phone = phone;
		this.#code = code;
	}

	prepare() {
		this.message
			.to(this.#phone)
			.emoji("lock")
			.content(" ")
			.bold(this.#code)
			.content(" is your verification code.")
			.line()
			.line()
			.italic("This code expires in 10 minutes.");
	}
}
```

## Rules

1. Class name should be PascalCase ending in `WhatsApp` (e.g., `WelcomeWhatsApp`, `OtpWhatsApp`)
2. Accept required data via constructor parameters, store as private fields
3. `prepare()` can be async if it needs to fetch data (e.g., from DB)
4. Always validate phone numbers are E.164 format — the `message.to()` method handles this
5. WhatsApp content limit is 4096 chars — much larger than SMS
6. Use `this.message.from()` only if overriding the provider's default sender
7. Use formatting helpers: `.bold()`, `.italic()`, `.emoji()`, `.line()` for rich messages

## Message Builder API

```ts
this.message
  .to("+1234567890")      // Set recipient (E.164 format)
  .from("+9876543210")    // Optional: override sender
  .content("plain text")  // Append plain text
  .bold("important")      // Append *bold* text
  .italic("emphasis")     // Append _italic_ text
  .line()                 // Append newline
  .emoji("check")         // Append emoji by name
```

### Available emojis

`check` ✅, `lock` 🔒, `key` 🔑, `wave` 👋, `rocket` 🚀, `warning` ⚠️, `bell` 🔔, `star` ⭐, `heart` ❤️, `fire` 🔥, `sparkles` ✨, `shield` 🛡️, `clock` ⏰, `package` 📦, `thumbsup` 👍, `tada` 🎉

### Standalone formatting helpers

```ts
import { bold, italic, strike, mono, codeBlock } from "@/lib/whatsapp";

const text = `${bold("Hello!")} Welcome to our service.`;
```

## Usage

```ts
import { WhatsAppManager } from "@/lib/whatsapp";
import { OtpWhatsApp } from "@/lib/whatsapp/messages/otp";

const manager = new WhatsAppManager({
	default: "json",
	mailers: { json: { provider: "json" } },
});

// Class style — manager detects BaseWhatsApp and calls msg.send(sender)
await manager.send(new OtpWhatsApp("+1234567890", "123456"));

// Callback style — inline message composition
await manager.send((m) => m.to("+1234567890").content("Your order has shipped!"));

// Specific mailer
await manager.use("twilio").send(new OtpWhatsApp("+1234567890", "123456"));
```

## shouldSend() guard

Override `shouldSend()` to conditionally skip sending:

```ts
import { BaseWhatsApp } from "@/lib/whatsapp";

export class OrderShippedWhatsApp extends BaseWhatsApp {
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
			.emoji("package")
			.content(" ")
			.bold("Order Shipped!")
			.line()
			.content(`Your order #${this.#orderId} is on its way.`);
	}
}
```

## Testing with FakeSender

```ts
import { FakeSender } from "@/lib/whatsapp";
import { OtpWhatsApp } from "@/lib/whatsapp/messages/otp";

// Enable fake mode — all sends go through the fake sender
const fake = whatsappManager.fake();

// ... run code that sends WhatsApp messages ...
await whatsappManager.send(new OtpWhatsApp("+1234567890", "123456"));

// Assert on captured messages
fake.assertSent(OtpWhatsApp);
fake.assertSentCount(1);
fake.assertNotSent(OrderShippedWhatsApp);

// Restore normal mode
whatsappManager.restore();
```
