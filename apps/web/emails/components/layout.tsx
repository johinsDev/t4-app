import {
	Body,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";

interface EmailLayoutProps {
	preview?: string;
	children: React.ReactNode;
	appName?: string;
	logoUrl?: string;
}

export function EmailLayout({ preview, children, appName = "T4 App", logoUrl }: EmailLayoutProps) {
	return (
		<Html>
			<Head />
			{preview && <Preview>{preview}</Preview>}
			<Tailwind>
				<Body className="mx-auto my-0 bg-gray-50 font-sans">
					<Container className="mx-auto max-w-[600px] rounded-lg bg-white px-8 py-10 shadow-sm">
						{/* Header */}
						<Section className="mb-8 text-center">
							{logoUrl ? (
								<Img src={logoUrl} alt={appName} width={48} height={48} className="mx-auto mb-4" />
							) : (
								<Text className="text-xl font-bold text-gray-900">{appName}</Text>
							)}
						</Section>

						{/* Content */}
						{children}

						{/* Footer */}
						<Hr className="mt-10 border-gray-200" />
						<Section className="mt-6 text-center">
							<Text className="text-xs leading-5 text-gray-400">
								&copy; {new Date().getFullYear()} {appName}. All rights reserved.
							</Text>
							<Text className="mt-1 text-xs text-gray-400">
								<Link href="#" className="text-gray-400 underline">
									Unsubscribe
								</Link>
								{" · "}
								<Link href="#" className="text-gray-400 underline">
									Preferences
								</Link>
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
