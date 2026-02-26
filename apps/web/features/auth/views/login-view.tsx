import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleButton } from "../components/google-button";
import { OrDivider } from "../components/or-divider";
import { PhoneOtpForm } from "../components/phone-otp-form";

export function LoginView() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Log In</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<GoogleButton />
					<OrDivider />
					<PhoneOtpForm />
				</CardContent>
			</Card>
		</div>
	);
}
