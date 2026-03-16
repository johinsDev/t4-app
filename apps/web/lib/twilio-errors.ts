/**
 * Mapping of common Twilio error codes to human-readable descriptions.
 * Used by SMS and WhatsApp transports to provide meaningful error messages
 * when `errorMessage` from the Twilio API is empty.
 *
 * @see https://www.twilio.com/docs/api/errors
 * @see https://www.twilio.com/docs/whatsapp/api/error-code-mapping
 */
const TWILIO_ERRORS: Record<number, string> = {
	// SMS errors (21xxx)
	21211: "Invalid 'To' phone number",
	21408: "Permission to send an SMS has not been enabled for the region",
	21610: "Message blocked — recipient has unsubscribed",
	21611: "This 'From' number has exceeded its max number of queued messages",
	21612: "The 'To' phone number is not currently reachable via SMS",
	21614: "Invalid 'To' number — not a valid mobile number",
	21617: "The concatenated message body exceeds the 1600 character limit",

	// Delivery errors (30xxx)
	30001: "Queue overflow — too many messages queued",
	30002: "Account suspended",
	30003: "Unreachable destination handset",
	30004: "Message blocked by carrier",
	30005: "Unknown destination handset",
	30006: "Landline or unreachable carrier",
	30007: "Carrier violation — content or frequency rejected",
	30008: "Unknown error during delivery",
	30034: "Message blocked due to messaging policy violation",

	// WhatsApp errors (63xxx)
	63001: "Channel could not authenticate the request",
	63003: "Channel could not authenticate — invalid credentials or configuration",
	63005: "Channel did not accept the given content",
	63007: "WhatsApp rate limit exceeded — slow down message sending",
	63010: "Internal error from WhatsApp channel",
	63012: "WhatsApp returned an internal service error — try again later",
	63013: "Meta imposed WhatsApp restrictions on this account",
	63015: "Sandbox can only send to phone numbers that have joined the Sandbox",
	63016: "Outside the 24h messaging window — use a pre-approved Message Template",
	63018: "WhatsApp rate limit or policy restriction from Meta",
	63019: "Bad request — invalid parameters sent to WhatsApp",
	63020: "Payment required — WhatsApp billing issue",
	63021: "Request timeout or message expired on WhatsApp",
	63022: "Message rejected by WhatsApp — content policy violation",
	63024: "WhatsApp account or number configuration error",
	63025: "WhatsApp parameter format error",
	63027: "WhatsApp template not found or rejected",
	63028: "WhatsApp business account error",
	63029: "WhatsApp media download error",
	63030: "WhatsApp number not registered",
	63032: "WhatsApp cloud API restrictions",
};

export function getTwilioErrorMessage(errorCode: number, fallback?: string): string {
	return TWILIO_ERRORS[errorCode] ?? fallback ?? `Unknown Twilio error (${errorCode})`;
}
