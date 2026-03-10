"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TokenState {
	token: string | null;
	host: string | null;
	isLoading: boolean;
	error: string | null;
}

export function usePartykitToken() {
	const [state, setState] = useState<TokenState>({
		token: null,
		host: null,
		isLoading: true,
		error: null,
	});
	const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const fetchToken = useCallback(async () => {
		try {
			setState((prev) => ({ ...prev, isLoading: true, error: null }));
			const res = await fetch("/api/partykit/token");
			if (!res.ok) {
				throw new Error(`Token fetch failed: ${res.status}`);
			}
			const data = await res.json();
			setState({ token: data.token, host: data.host, isLoading: false, error: null });

			// Auto-refresh at 50 min (for 1h token)
			clearTimeout(refreshTimerRef.current);
			refreshTimerRef.current = setTimeout(fetchToken, 50 * 60 * 1000);
		} catch (err) {
			setState({
				token: null,
				host: null,
				isLoading: false,
				error: err instanceof Error ? err.message : "Failed to fetch token",
			});
		}
	}, []);

	useEffect(() => {
		fetchToken();
		return () => clearTimeout(refreshTimerRef.current);
	}, [fetchToken]);

	return { ...state, refetch: fetchToken };
}
