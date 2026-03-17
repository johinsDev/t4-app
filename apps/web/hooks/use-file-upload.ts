"use client";

import { useCallback, useRef, useState } from "react";
import { trpc } from "@/trpc/client";

export interface FileUploadEntry {
	key: string;
	file: File;
	status: "idle" | "uploading" | "success" | "error";
	progress: number;
	url?: string;
	error?: string;
}

interface UseFileUploadOptions {
	disk?: string;
	maxSize?: number;
	accept?: string[];
	onSuccess?: (file: File, url: string) => void;
	onError?: (file: File, error: Error) => void;
}

interface UseFileUploadReturn {
	entries: FileUploadEntry[];
	isUploading: boolean;
	upload: (files: File[]) => Promise<void>;
	remove: (key: string) => void;
	clear: () => void;
}

function generateKey(file: File): string {
	const name = file.name.replace(/\.[^.]+$/, "");
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	return `${slug}-${Date.now()}.${ext}`;
}

export function useFileUpload(options?: UseFileUploadOptions): UseFileUploadReturn {
	const [entries, setEntries] = useState<FileUploadEntry[]>([]);
	const abortControllers = useRef<Map<string, AbortController>>(new Map());

	const createUploadUrl = trpc.storage.createUploadUrl.useMutation();
	const utils = trpc.useUtils();

	const isUploading = entries.some((e) => e.status === "uploading");

	const updateEntry = useCallback((key: string, update: Partial<FileUploadEntry>) => {
		setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...update } : e)));
	}, []);

	const uploadSingleFile = useCallback(
		async (file: File) => {
			const key = generateKey(file);

			const maxSize = options?.maxSize;
			if (maxSize && file.size > maxSize) {
				setEntries((prev) => [
					...prev,
					{
						key,
						file,
						status: "error",
						progress: 0,
						error: `File exceeds maximum size of ${Math.round(maxSize / (1024 * 1024))}MB`,
					},
				]);
				options?.onError?.(file, new Error("File too large"));
				return;
			}

			setEntries((prev) => [...prev, { key, file, status: "uploading", progress: 0 }]);

			try {
				const { url: uploadUrl } = await createUploadUrl.mutateAsync({
					key,
					contentType: file.type,
					disk: options?.disk,
				});

				await new Promise<void>((resolve, reject) => {
					const xhr = new XMLHttpRequest();
					const controller = new AbortController();
					abortControllers.current.set(key, controller);

					controller.signal.addEventListener("abort", () => {
						xhr.abort();
						reject(new Error("Upload aborted"));
					});

					xhr.upload.addEventListener("progress", (e) => {
						if (e.lengthComputable) {
							const progress = Math.round((e.loaded / e.total) * 100);
							updateEntry(key, { progress });
						}
					});

					xhr.addEventListener("load", () => {
						if (xhr.status >= 200 && xhr.status < 300) {
							resolve();
						} else {
							reject(new Error(`Upload failed with status ${xhr.status}`));
						}
					});

					xhr.addEventListener("error", () => reject(new Error("Upload failed")));
					xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

					xhr.open("PUT", uploadUrl);
					xhr.setRequestHeader("Content-Type", file.type);
					xhr.send(file);
				});

				const { url: downloadUrl } = await utils.storage.createDownloadUrl.fetch({
					key,
					disk: options?.disk,
				});

				updateEntry(key, { status: "success", progress: 100, url: downloadUrl });
				abortControllers.current.delete(key);
				options?.onSuccess?.(file, downloadUrl);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Upload failed";
				updateEntry(key, { status: "error", error: message });
				abortControllers.current.delete(key);
				options?.onError?.(file, err instanceof Error ? err : new Error(message));
			}
		},
		[createUploadUrl, utils, options, updateEntry],
	);

	const upload = useCallback(
		async (filesToUpload: File[]) => {
			await Promise.all(filesToUpload.map(uploadSingleFile));
		},
		[uploadSingleFile],
	);

	const remove = useCallback((key: string) => {
		const controller = abortControllers.current.get(key);
		if (controller) {
			controller.abort();
			abortControllers.current.delete(key);
		}
		setEntries((prev) => prev.filter((e) => e.key !== key));
	}, []);

	const clear = useCallback(() => {
		for (const controller of abortControllers.current.values()) {
			controller.abort();
		}
		abortControllers.current.clear();
		setEntries([]);
	}, []);

	return { entries, isUploading, upload, remove, clear };
}
