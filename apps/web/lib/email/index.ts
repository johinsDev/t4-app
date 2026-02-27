export { BaseMail } from "./base-mail";
export { emailManager } from "./config";
export { EmailManager } from "./email-manager";
export { EmailMessage } from "./email-message";
export { EmailSender } from "./email-sender";
export {
	EmailError,
	InvalidEmailError,
	InvalidMessageError,
	ProviderError,
	RateLimitError,
} from "./errors";
export { FakeSender } from "./fake-sender";
export { getPreview, listPreviews } from "./preview-store";
export { emailAddressSchema, emailContentSchema, emailSubjectSchema } from "./schemas";
export { JsonTransport, ResendTransport } from "./transports";
export type {
	EmailAttachment,
	EmailComposeCallback,
	EmailManagerConfig,
	EmailMessageData,
	EmailPreview,
	EmailResponse,
	EmailTransport,
	JsonProviderConfig,
	LogLevel,
	ProviderConfig,
	Recipient,
	ResendProviderConfig,
} from "./types";
