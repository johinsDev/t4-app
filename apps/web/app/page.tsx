"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function Home() {
	const router = useRouter();

	async function handleLogout() {
		await authClient.signOut();
		router.push("/login");
	}

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
			<h1 className="text-2xl font-bold">Home</h1>
			<Button variant="outline" onClick={handleLogout}>
				Log out
			</Button>
		</div>
	);
}
