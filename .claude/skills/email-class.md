# Email Class Generator

Generate email notification classes that extend `BaseMail` from the email library.

## When to use

When the user asks to create a new email notification class (e.g., "create a welcome email", "write an OTP verification email class").

## Structure

All email classes live in `apps/web/lib/email/messages/` and follow this pattern:

```ts
import { render } from "@react-email/render";
import { BaseMail } from "@/lib/email";
import WelcomeEmail from "@/emails/welcome";

export class WelcomeMail extends BaseMail {
	readonly #name: string;
	readonly #email: string;

	constructor(name: string, email: string) {
		super();
		this.#name = name;
		this.#email = email;
	}

	async prepare() {
		const html = await render(WelcomeEmail({ name: this.#name }));
		this.message
			.to(this.#email, this.#name)
			.subject("Welcome!")
			.html(html);
	}
}
```

## Rules

1. Class name should be PascalCase ending in `Mail` (e.g., `WelcomeMail`, `OtpMail`, `OrderConfirmationMail`)
2. Accept required data via constructor parameters, store as private fields
3. `prepare()` is typically async because `render()` from `@react-email/render` is async
4. Use react-email templates from `apps/web/emails/` for HTML content
5. Always set `.subject()` and either `.html()` or `.text()`
6. Use `this.message.from()` only if overriding the provider's default sender
7. Use `.cc()`, `.bcc()`, `.replyTo()` for additional recipients
8. Use `.tag()` for Resend analytics tags
9. Use `.priority()` for urgent emails

## Message Builder API

```ts
this.message
  .to("user@example.com", "John")  // Add recipient (can call multiple times)
  .from("noreply@example.com")      // Optional: override sender
  .cc("boss@example.com")           // Carbon copy
  .bcc("audit@example.com")         // Blind carbon copy
  .replyTo("support@example.com")   // Reply-to address
  .subject("Your order shipped")    // Email subject
  .html("<p>Hello!</p>")            // HTML body (usually from react-email render())
  .text("Hello!")                    // Plain text fallback
  .attach("/path/to/file.pdf")      // Attach file
  .attachData(buffer, { filename: "report.pdf" })  // Attach raw data
  .tag("category", "transactional") // Resend analytics tag
  .priority("high")                 // Email priority
  .header("X-Custom", "value")      // Custom header
  .listUnsubscribe("https://...")   // Unsubscribe header
```

## React Email Templates

Templates live in `apps/web/emails/` and use `@react-email/components`:

```tsx
import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "./components/layout";

interface Props {
  name: string;
}

export default function MyEmail({ name }: Props) {
  return (
    <EmailLayout preview="Preview text">
      <Heading>Hello {name}!</Heading>
      <Text>Your email content here.</Text>
    </EmailLayout>
  );
}

MyEmail.PreviewProps = { name: "John" } satisfies Props;
```

Preview templates with: `bun run email:dev` (opens at localhost:3002)

## Usage

```ts
import { emailManager } from "@/lib/email";
import { WelcomeMail } from "@/lib/email/messages/welcome";

// Class style — manager detects BaseMail and calls mail.send(sender)
await emailManager.send(new WelcomeMail("John", "john@example.com"));

// Callback style — inline message composition
await emailManager.send((m) =>
  m.to("user@example.com").subject("Hi").html("<p>Hello</p>")
);

// Specific mailer
await emailManager.use("resend").send(new WelcomeMail("John", "john@example.com"));
```

## shouldSend() guard

Override `shouldSend()` to conditionally skip sending:

```ts
import { BaseMail } from "@/lib/email";

export class OrderShippedMail extends BaseMail {
	readonly #orderId: string;
	readonly #email: string;

	constructor(orderId: string, email: string) {
		super();
		this.#orderId = orderId;
		this.#email = email;
	}

	async shouldSend(): Promise<boolean> {
		const order = await db.query.orders.findFirst({
			where: (t, { eq }) => eq(t.id, this.#orderId),
		});
		return order?.status === "shipped";
	}

	async prepare() {
		const html = await render(OrderShippedEmail({ orderId: this.#orderId }));
		this.message
			.to(this.#email)
			.subject(`Order #${this.#orderId} has shipped`)
			.html(html);
	}
}
```

## Testing with FakeSender

```ts
import { FakeSender } from "@/lib/email";
import { WelcomeMail } from "@/lib/email/messages/welcome";

// Enable fake mode — all sends go through the fake sender
const fake = emailManager.fake();

// ... run code that sends email ...
await emailManager.send(new WelcomeMail("John", "john@example.com"));

// Assert on captured messages
fake.assertSent(WelcomeMail);
fake.assertSentCount(1);
fake.assertNotSent(OrderShippedMail);

// Restore normal mode
emailManager.restore();
```
