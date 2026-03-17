"use client";

import { useCallback } from "react";
import type { Accept, FileRejection } from "react-dropzone";
import {
	Dropzone,
	DropzoneContent,
	DropzoneDescription,
	type DropzoneFile,
	DropzoneIcon,
	DropzoneLabel,
	DropzoneList,
	DropzoneListItem,
} from "@/components/ui/dropzone";
import { useFileUpload } from "@/hooks/use-file-upload";

interface FileUploadProps {
	disk?: string;
	accept?: Accept;
	maxFiles?: number;
	maxSize?: number;
	multiple?: boolean;
	label?: string;
	description?: string;
	onUploadComplete?: (urls: string[]) => void;
	onError?: (file: File, error: Error) => void;
	disabled?: boolean;
	className?: string;
}

export function FileUpload({
	disk,
	accept,
	maxFiles,
	maxSize,
	multiple = true,
	label,
	description,
	onUploadComplete,
	onError,
	disabled,
	className,
}: FileUploadProps) {
	const { entries, isUploading, upload, remove } = useFileUpload({
		disk,
		maxSize,
		onSuccess: () => {
			const completedUrls = entries
				.filter((e): e is typeof e & { url: string } => e.status === "success" && !!e.url)
				.map((e) => e.url);
			onUploadComplete?.(completedUrls);
		},
		onError,
	});

	const dropzoneFiles: DropzoneFile[] = entries.map((e) => ({
		id: e.key,
		file: e.file,
	}));

	const handleDrop = useCallback(
		(accepted: File[], _rejected: FileRejection[]) => {
			upload(accepted);
		},
		[upload],
	);

	const handleRemove = useCallback(
		(id: string) => {
			remove(id);
		},
		[remove],
	);

	return (
		<Dropzone
			accept={accept}
			maxFiles={maxFiles}
			maxSize={maxSize}
			multiple={multiple}
			disabled={disabled || isUploading}
			files={dropzoneFiles}
			onDrop={handleDrop}
			onRemove={handleRemove}
			className={className}
		>
			<DropzoneContent>
				<DropzoneIcon />
				<DropzoneLabel>{label}</DropzoneLabel>
				{description && <DropzoneDescription>{description}</DropzoneDescription>}
			</DropzoneContent>

			<DropzoneList>
				{entries.map((entry) => (
					<DropzoneListItem
						key={entry.key}
						file={{ id: entry.key, file: entry.file }}
						progress={entry.progress}
						error={entry.error}
					/>
				))}
			</DropzoneList>
		</Dropzone>
	);
}
