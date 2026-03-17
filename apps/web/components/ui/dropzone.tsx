"use client";

import { UploadIcon, XIcon } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useId } from "react";
import { type Accept, type DropzoneOptions, type FileRejection, useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

// ── Context ──────────────────────────────────────────────────

interface DropzoneFile {
	id: string;
	file: File;
}

interface DropzoneContextValue {
	files: DropzoneFile[];
	isDragActive: boolean;
	getRootProps: ReturnType<typeof useDropzone>["getRootProps"];
	getInputProps: ReturnType<typeof useDropzone>["getInputProps"];
	removeFile: (id: string) => void;
	disabled?: boolean;
}

const DropzoneContext = createContext<DropzoneContextValue | null>(null);

function useDropzoneContext() {
	const ctx = useContext(DropzoneContext);
	if (!ctx) throw new Error("Dropzone compound components must be used within <Dropzone>");
	return ctx;
}

// ── Root ─────────────────────────────────────────────────────

interface DropzoneProps {
	children: ReactNode;
	accept?: Accept;
	maxFiles?: number;
	maxSize?: number;
	multiple?: boolean;
	disabled?: boolean;
	files: DropzoneFile[];
	onDrop: (accepted: File[], rejected: FileRejection[]) => void;
	onRemove: (id: string) => void;
	className?: string;
}

function Dropzone({
	children,
	accept,
	maxFiles,
	maxSize,
	multiple = true,
	disabled,
	files,
	onDrop,
	onRemove,
	className,
}: DropzoneProps) {
	const opts: DropzoneOptions = {
		accept,
		maxFiles,
		maxSize,
		multiple,
		disabled,
		onDrop,
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone(opts);

	return (
		<DropzoneContext.Provider
			value={{ files, isDragActive, getRootProps, getInputProps, removeFile: onRemove, disabled }}
		>
			<div data-slot="dropzone" className={cn("flex flex-col gap-3", className)}>
				{children}
			</div>
		</DropzoneContext.Provider>
	);
}

// ── Content (drop area) ──────────────────────────────────────

function DropzoneContent({ className, children }: { className?: string; children?: ReactNode }) {
	const { getRootProps, getInputProps, isDragActive, disabled } = useDropzoneContext();

	return (
		<div
			{...getRootProps()}
			data-slot="dropzone-content"
			data-drag-active={isDragActive || undefined}
			className={cn(
				"flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
				"border-muted-foreground/25 hover:border-muted-foreground/50",
				"data-[drag-active]:border-primary data-[drag-active]:bg-primary/5",
				disabled && "pointer-events-none opacity-50",
				className,
			)}
		>
			<input {...getInputProps()} />
			{children}
		</div>
	);
}

// ── Icon ─────────────────────────────────────────────────────

function DropzoneIcon({ className }: { className?: string }) {
	return <UploadIcon className={cn("size-8 text-muted-foreground", className)} />;
}

// ── Label ────────────────────────────────────────────────────

function DropzoneLabel({ className, children }: { className?: string; children?: ReactNode }) {
	return (
		<p data-slot="dropzone-label" className={cn("text-sm font-medium text-foreground", className)}>
			{children ?? "Drag & drop files here"}
		</p>
	);
}

// ── Description ──────────────────────────────────────────────

function DropzoneDescription({
	className,
	children,
}: {
	className?: string;
	children?: ReactNode;
}) {
	return (
		<p data-slot="dropzone-description" className={cn("text-xs text-muted-foreground", className)}>
			{children}
		</p>
	);
}

// ── File list ────────────────────────────────────────────────

function DropzoneList({ className, children }: { className?: string; children?: ReactNode }) {
	const { files } = useDropzoneContext();
	if (files.length === 0) return null;

	return (
		<div data-slot="dropzone-list" className={cn("flex flex-col gap-2", className)}>
			{children}
		</div>
	);
}

// ── File list item ───────────────────────────────────────────

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DropzoneListItemProps {
	file: DropzoneFile;
	progress?: number;
	error?: string;
	className?: string;
}

function DropzoneListItem({ file, progress, error, className }: DropzoneListItemProps) {
	const { removeFile, disabled } = useDropzoneContext();
	const progressId = useId();

	const handleRemove = useCallback(() => {
		removeFile(file.id);
	}, [removeFile, file.id]);

	return (
		<div
			data-slot="dropzone-list-item"
			className={cn(
				"flex items-center gap-3 rounded-md border px-3 py-2",
				error && "border-destructive/50 bg-destructive/5",
				className,
			)}
		>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="truncate text-sm font-medium">{file.file.name}</p>
				<p className="text-xs text-muted-foreground">{formatFileSize(file.file.size)}</p>
				{error && <p className="text-xs text-destructive">{error}</p>}
				{progress !== undefined && progress < 100 && !error && (
					<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
						<div
							role="progressbar"
							aria-label={`Upload progress for ${file.file.name}`}
							aria-valuenow={progress}
							aria-valuemin={0}
							aria-valuemax={100}
							id={progressId}
							className="h-full rounded-full bg-primary transition-all duration-300"
							style={{ width: `${progress}%` }}
						/>
					</div>
				)}
			</div>
			<button
				type="button"
				onClick={handleRemove}
				disabled={disabled}
				className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground disabled:pointer-events-none"
			>
				<XIcon className="size-4" />
			</button>
		</div>
	);
}

export {
	Dropzone,
	DropzoneContent,
	DropzoneDescription,
	DropzoneIcon,
	DropzoneLabel,
	DropzoneList,
	DropzoneListItem,
	type DropzoneFile,
	type DropzoneProps,
};
