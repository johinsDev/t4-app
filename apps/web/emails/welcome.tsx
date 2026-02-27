import { Button, Heading, Hr, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./components/layout";

interface WelcomeEmailProps {
	name: string;
	appName?: string;
	loginUrl?: string;
}

export default function WelcomeEmail({
	name,
	appName = "T4 App",
	loginUrl = "http://localhost:3001",
}: WelcomeEmailProps) {
	return (
		<EmailLayout preview={`Welcome to ${appName}, ${name}!`} appName={appName}>
			<Heading className="text-2xl font-bold text-gray-900">Welcome to {appName}!</Heading>

			<Text className="mt-4 text-base leading-6 text-gray-600">Hi {name},</Text>

			<Text className="mt-2 text-base leading-6 text-gray-600">
				Thanks for signing up. We&apos;re excited to have you on board. Your account is ready and
				you can start exploring right away.
			</Text>

			{/* CTA Button */}
			<Section className="mt-8 text-center">
				<Button
					href={loginUrl}
					className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white"
				>
					Get Started
				</Button>
			</Section>

			<Hr className="my-8 border-gray-200" />

			{/* Feature highlights */}
			<Text className="text-sm font-semibold text-gray-900">Here&apos;s what you can do:</Text>

			<Text className="mt-2 text-sm leading-6 text-gray-600">
				&bull; Set up your profile and preferences
				<br />
				&bull; Explore the dashboard
				<br />
				&bull; Connect your integrations
			</Text>

			<Text className="mt-6 text-sm leading-6 text-gray-600">
				If you have any questions, just reply to this email or visit our{" "}
				<Link href="#" className="text-blue-600 underline">
					help center
				</Link>
				.
			</Text>

			<Text className="mt-6 text-sm text-gray-400">&mdash; The {appName} Team</Text>
		</EmailLayout>
	);
}

WelcomeEmail.PreviewProps = {
	name: "John",
	appName: "T4 App",
	loginUrl: "http://localhost:3001",
} satisfies WelcomeEmailProps;
