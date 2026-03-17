"use client";

import { FileIcon, FileTextIcon, ImageIcon, Music2Icon, TrashIcon, VideoIcon } from "lucide-react";
import { useCallback, useState } from "react";
import type { FileRejection } from "react-dropzone";
import { FileUpload } from "@/components/file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/trpc/client";

export default function StorageTestPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-12">
			<div className="mb-8">
				<h1 className="text-2xl font-semibold tracking-tight">Storage Test Console</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Test file uploads and storage operations. Different examples of Dropzone composition and
					FileUpload customization.
				</p>
			</div>

			<div className="grid gap-8">
				<HealthCheck />

				<div>
					<h2 className="mb-4 text-lg font-semibold">FileUpload (connected)</h2>
					<p className="text-muted-foreground mb-6 text-sm">
						Ready-to-use component: Dropzone UI + useFileUpload hook. Requires authentication.
					</p>
					<div className="grid gap-6 lg:grid-cols-2">
						<FileUploadDefault />
						<FileUploadDocuments />
					</div>
				</div>

				<div>
					<h2 className="mb-4 text-lg font-semibold">useFileUpload + Custom UI</h2>
					<p className="text-muted-foreground mb-6 text-sm">
						Hook connected to custom UI — no Dropzone components. Shows how to decouple upload logic
						from presentation.
					</p>
					<div className="grid gap-6 lg:grid-cols-2">
						<HookWithInputDemo />
						<HookWithAvatarDemo />
					</div>
				</div>

				<div>
					<h2 className="mb-4 text-lg font-semibold">File Previews (images + documents)</h2>
					<p className="text-muted-foreground mb-6 text-sm">
						Upload any file — images show thumbnails, documents show type icon and metadata.
					</p>
					<div className="grid gap-6 lg:grid-cols-2">
						<PreviewUploadDemo />
						<PreviewGridDemo />
					</div>
				</div>

				<div>
					<h2 className="mb-4 text-lg font-semibold">useFileUpload + Dropzone (manual wiring)</h2>
					<p className="text-muted-foreground mb-6 text-sm">
						Hook + Dropzone UI components wired manually — full control over layout and styles.
					</p>
					<HookWithDropzoneDemo />
				</div>

				<div>
					<h2 className="mb-4 text-lg font-semibold">Dropzone UI only (no upload)</h2>
					<p className="text-muted-foreground mb-6 text-sm">
						Pure UI composition — drag & drop file selection without upload logic. For forms,
						previews, or client-side processing.
					</p>
					<div className="grid gap-6 lg:grid-cols-3">
						<DropzoneDefault />
						<DropzoneCompact />
						<DropzoneHero />
					</div>
					<div className="mt-6 grid gap-6 lg:grid-cols-2">
						<DropzoneImageGrid />
						<DropzoneMinimal />
					</div>
				</div>

				<FileListDemo />
			</div>
		</div>
	);
}

// ── Health Check ──────────────────────────────────────────────

function HealthCheck() {
	const { data, isLoading, refetch } = trpc.health.storage.useQuery();

	return (
		<Card>
			<CardHeader>
				<CardTitle>Storage Health</CardTitle>
				<CardDescription>
					Tests put, get, and delete cycle on the configured provider.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-3">
					{isLoading ? (
						<Badge variant="secondary">Checking...</Badge>
					) : data?.status === "ok" ? (
						<Badge variant="default">OK</Badge>
					) : (
						<Badge variant="destructive">Error</Badge>
					)}
					{data && (
						<span className="text-muted-foreground text-sm">
							Provider: <strong>{data.provider}</strong> — {data.latencyMs}ms
						</span>
					)}
					{data?.error && <span className="text-sm text-destructive">{data.error}</span>}
					<Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
						Re-check
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

// ── FileUpload (connected) demos ─────────────────────────────

function FileUploadDefault() {
	const [urls, setUrls] = useState<string[]>([]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Images</CardTitle>
				<CardDescription>Default FileUpload for image uploads.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<FileUpload
					accept={{ "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] }}
					maxFiles={3}
					maxSize={5 * 1024 * 1024}
					label="Upload images"
					description="PNG, JPG, GIF, WebP up to 5MB"
					onUploadComplete={setUrls}
				/>
				<UrlList urls={urls} />
			</CardContent>
		</Card>
	);
}

function FileUploadDocuments() {
	const [urls, setUrls] = useState<string[]>([]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Documents</CardTitle>
				<CardDescription>FileUpload configured for PDF documents.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<FileUpload
					accept={{ "application/pdf": [".pdf"] }}
					maxFiles={5}
					maxSize={25 * 1024 * 1024}
					label="Upload PDFs"
					description="PDF files, up to 25MB each"
					onUploadComplete={setUrls}
				/>
				<UrlList urls={urls} />
			</CardContent>
		</Card>
	);
}

// ── useFileUpload + Custom UI demos ──────────────────────────

function HookWithInputDemo() {
	const { entries, upload, remove } = useFileUpload({
		maxSize: 10 * 1024 * 1024,
		onSuccess: (_file, url) => console.log("Uploaded:", url),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Plain &lt;input type=&quot;file&quot;&gt;</CardTitle>
				<CardDescription>Hook connected to a native file input. No drag & drop.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<input
					type="file"
					multiple
					onChange={(e) => {
						if (e.target.files) upload([...e.target.files]);
					}}
					className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
				/>
				{entries.map((entry) => (
					<div key={entry.key} className="flex items-center gap-2 text-sm">
						<span className="truncate">{entry.file.name}</span>
						<Badge variant={entry.status === "success" ? "default" : "secondary"}>
							{entry.status === "uploading" ? `${entry.progress}%` : entry.status}
						</Badge>
						{entry.error && <span className="text-xs text-destructive">{entry.error}</span>}
						<button
							type="button"
							onClick={() => remove(entry.key)}
							className="ml-auto text-muted-foreground hover:text-foreground"
						>
							<TrashIcon className="size-3.5" />
						</button>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function HookWithAvatarDemo() {
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const { entries, upload } = useFileUpload({
		maxSize: 2 * 1024 * 1024,
		onSuccess: (_file, url) => setAvatarUrl(url),
	});

	const entry = entries[0];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Avatar Upload</CardTitle>
				<CardDescription>
					Hook with custom circular drop zone — single file, no DropzoneListItem.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col items-center gap-3">
					<label className="group relative flex size-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50">
						{avatarUrl ? (
							// biome-ignore lint/performance/noImgElement: demo page, not production
							<img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
						) : (
							<ImageIcon className="size-8 text-muted-foreground group-hover:text-foreground" />
						)}
						<input
							type="file"
							accept="image/png,image/jpeg"
							className="hidden"
							onChange={(e) => {
								if (e.target.files?.[0]) upload([e.target.files[0]]);
							}}
						/>
					</label>
					<div className="text-center text-xs text-muted-foreground">
						{entry?.status === "uploading" && `Uploading... ${entry.progress}%`}
						{entry?.status === "success" && "Uploaded!"}
						{entry?.error && <span className="text-destructive">{entry.error}</span>}
						{!entry && "Click to upload avatar"}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// ── useFileUpload + Dropzone (manual wiring) ─────────────────

function HookWithDropzoneDemo() {
	const { entries, isUploading, upload, remove } = useFileUpload({
		maxSize: 10 * 1024 * 1024,
	});

	const files: DropzoneFile[] = entries.map((e) => ({ id: e.key, file: e.file }));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Custom-styled Dropzone + Hook</CardTitle>
				<CardDescription>
					Dropzone UI components manually wired to useFileUpload. Full control over every piece.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Dropzone
					accept={{ "image/*": [".png", ".jpg"], "application/pdf": [".pdf"] }}
					maxFiles={5}
					disabled={isUploading}
					files={files}
					onDrop={(accepted) => upload(accepted)}
					onRemove={(id) => remove(id)}
				>
					<DropzoneContent className="min-h-[160px] rounded-xl border-primary/20 bg-primary/5">
						<DropzoneIcon className="size-10 text-primary/60" />
						<DropzoneLabel className="text-base font-semibold">Drop your files here</DropzoneLabel>
						<DropzoneDescription>Images and PDFs, up to 10MB</DropzoneDescription>
					</DropzoneContent>

					<DropzoneList className="gap-1.5">
						{entries.map((entry) => (
							<DropzoneListItem
								key={entry.key}
								file={{ id: entry.key, file: entry.file }}
								progress={entry.progress}
								error={entry.error}
								className="rounded-lg bg-muted/40"
							/>
						))}
					</DropzoneList>
				</Dropzone>
			</CardContent>
		</Card>
	);
}

// ── Dropzone UI only (no upload) demos ───────────────────────

function useLocalFiles() {
	const [files, setFiles] = useState<DropzoneFile[]>([]);

	const handleDrop = useCallback((accepted: File[], _rejected: FileRejection[]) => {
		const newFiles: DropzoneFile[] = accepted.map((file, i) => ({
			id: `${Date.now()}-${i}`,
			file,
		}));
		setFiles((prev) => [...prev, ...newFiles]);
	}, []);

	const handleRemove = useCallback((id: string) => {
		setFiles((prev) => prev.filter((f) => f.id !== id));
	}, []);

	return { files, handleDrop, handleRemove };
}

function DropzoneDefault() {
	const { files, handleDrop, handleRemove } = useLocalFiles();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Default</CardTitle>
				<CardDescription>Standard look with all components.</CardDescription>
			</CardHeader>
			<CardContent>
				<Dropzone
					accept={{ "image/*": [".png", ".jpg"] }}
					maxSize={5 * 1024 * 1024}
					files={files}
					onDrop={handleDrop}
					onRemove={handleRemove}
				>
					<DropzoneContent>
						<DropzoneIcon />
						<DropzoneLabel />
						<DropzoneDescription>PNG, JPG up to 5MB</DropzoneDescription>
					</DropzoneContent>
					<DropzoneList>
						{files.map((f) => (
							<DropzoneListItem key={f.id} file={f} />
						))}
					</DropzoneList>
				</Dropzone>
			</CardContent>
		</Card>
	);
}

function DropzoneCompact() {
	const { files, handleDrop, handleRemove } = useLocalFiles();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Compact</CardTitle>
				<CardDescription>Horizontal layout, smaller padding.</CardDescription>
			</CardHeader>
			<CardContent>
				<Dropzone
					accept={{ "application/pdf": [".pdf"] }}
					maxFiles={1}
					multiple={false}
					files={files}
					onDrop={handleDrop}
					onRemove={handleRemove}
				>
					<DropzoneContent className="flex-row gap-3 p-3">
						<FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
						<div className="text-left">
							<DropzoneLabel className="text-xs">Choose a PDF</DropzoneLabel>
							<DropzoneDescription>Max 10MB</DropzoneDescription>
						</div>
					</DropzoneContent>
					<DropzoneList>
						{files.map((f) => (
							<DropzoneListItem key={f.id} file={f} />
						))}
					</DropzoneList>
				</Dropzone>
			</CardContent>
		</Card>
	);
}

function DropzoneHero() {
	const { files, handleDrop, handleRemove } = useLocalFiles();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Hero</CardTitle>
				<CardDescription>Large drop area with bold styling.</CardDescription>
			</CardHeader>
			<CardContent>
				<Dropzone
					accept={{ "image/*": [".png", ".jpg", ".webp"] }}
					maxFiles={10}
					files={files}
					onDrop={handleDrop}
					onRemove={handleRemove}
				>
					<DropzoneContent className="min-h-[180px] rounded-2xl border-primary/30 bg-primary/5">
						<DropzoneIcon className="size-12 text-primary/50" />
						<DropzoneLabel className="text-lg font-bold">Drop course content</DropzoneLabel>
						<DropzoneDescription>Images up to 10 files</DropzoneDescription>
					</DropzoneContent>
					<DropzoneList>
						{files.map((f) => (
							<DropzoneListItem key={f.id} file={f} />
						))}
					</DropzoneList>
				</Dropzone>
			</CardContent>
		</Card>
	);
}

function DropzoneImageGrid() {
	const { files, handleDrop, handleRemove } = useLocalFiles();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Image Grid</CardTitle>
				<CardDescription>
					Custom file list — image thumbnails in a grid instead of DropzoneListItem.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Dropzone
					accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] }}
					maxFiles={6}
					files={files}
					onDrop={handleDrop}
					onRemove={handleRemove}
				>
					<DropzoneContent className="p-4">
						<ImageIcon className="size-6 text-muted-foreground" />
						<DropzoneLabel className="text-xs">Add images</DropzoneLabel>
					</DropzoneContent>

					{files.length > 0 && (
						<div className="grid grid-cols-3 gap-2">
							{files.map((f) => (
								<div
									key={f.id}
									className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
								>
									{/* biome-ignore lint/performance/noImgElement: demo page, preview only */}
									<img
										src={URL.createObjectURL(f.file)}
										alt={f.file.name}
										className="size-full object-cover"
									/>
									<button
										type="button"
										onClick={() => handleRemove(f.id)}
										className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
									>
										<TrashIcon className="size-3" />
									</button>
								</div>
							))}
						</div>
					)}
				</Dropzone>
			</CardContent>
		</Card>
	);
}

function DropzoneMinimal() {
	const { files, handleDrop, handleRemove } = useLocalFiles();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Minimal (button-like)</CardTitle>
				<CardDescription>
					No border-dashed, no icon — just a clickable area that looks like a button.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Dropzone
					accept={{ "image/*": [".png", ".jpg"] }}
					maxFiles={1}
					multiple={false}
					files={files}
					onDrop={handleDrop}
					onRemove={handleRemove}
				>
					<DropzoneContent className="rounded-md border border-solid bg-muted/50 p-3 hover:bg-muted">
						<DropzoneLabel className="text-xs text-muted-foreground">
							Click or drop a file
						</DropzoneLabel>
					</DropzoneContent>
					<DropzoneList>
						{files.map((f) => (
							<DropzoneListItem key={f.id} file={f} />
						))}
					</DropzoneList>
				</Dropzone>
			</CardContent>
		</Card>
	);
}

// ── File Preview demos ────────────────────────────────────────

function getFileTypeInfo(file: File) {
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	const isImage = file.type.startsWith("image/");
	const isVideo = file.type.startsWith("video/");
	const isAudio = file.type.startsWith("audio/");
	const isPdf = file.type === "application/pdf" || ext === "pdf";

	let icon = FileIcon;
	let label = ext.toUpperCase() || "FILE";
	let color = "text-muted-foreground";

	if (isImage) {
		icon = ImageIcon;
		label = ext.toUpperCase();
		color = "text-blue-500";
	} else if (isPdf) {
		icon = FileTextIcon;
		label = "PDF";
		color = "text-red-500";
	} else if (isVideo) {
		icon = VideoIcon;
		label = ext.toUpperCase();
		color = "text-purple-500";
	} else if (isAudio) {
		icon = Music2Icon;
		label = ext.toUpperCase();
		color = "text-green-500";
	}

	return { isImage, icon, label, color };
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PreviewUploadDemo() {
	const { entries, isUploading, upload, remove } = useFileUpload({
		maxSize: 25 * 1024 * 1024,
	});

	const files: DropzoneFile[] = entries.map((e) => ({ id: e.key, file: e.file }));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">List with Previews</CardTitle>
				<CardDescription>
					Images show thumbnails, documents show type icon and file info.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Dropzone
					accept={{
						"image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
						"application/pdf": [".pdf"],
						"video/*": [".mp4", ".mov"],
						"audio/*": [".mp3", ".wav"],
					}}
					maxFiles={8}
					disabled={isUploading}
					files={files}
					onDrop={(accepted) => upload(accepted)}
					onRemove={(id) => remove(id)}
				>
					<DropzoneContent>
						<DropzoneIcon />
						<DropzoneLabel>Drop any files</DropzoneLabel>
						<DropzoneDescription>Images, PDFs, video, audio</DropzoneDescription>
					</DropzoneContent>

					{entries.length > 0 && (
						<div className="mt-3 space-y-2">
							{entries.map((entry) => {
								const info = getFileTypeInfo(entry.file);
								const Icon = info.icon;

								return (
									<div
										key={entry.key}
										className="flex items-center gap-3 rounded-lg border px-3 py-2"
									>
										{info.isImage ? (
											<div className="size-10 shrink-0 overflow-hidden rounded bg-muted">
												{/* biome-ignore lint/performance/noImgElement: demo preview */}
												<img
													src={entry.url ?? URL.createObjectURL(entry.file)}
													alt={entry.file.name}
													className="size-full object-cover"
												/>
											</div>
										) : (
											<div
												className={`flex size-10 shrink-0 items-center justify-center rounded bg-muted ${info.color}`}
											>
												<Icon className="size-5" />
											</div>
										)}

										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">{entry.file.name}</p>
											<p className="text-xs text-muted-foreground">
												{info.label} &middot; {formatFileSize(entry.file.size)}
												{entry.status === "uploading" && ` \u2022 ${entry.progress}%`}
												{entry.status === "success" && " \u2022 Uploaded"}
											</p>
										</div>

										{entry.error && (
											<span className="shrink-0 text-xs text-destructive">{entry.error}</span>
										)}

										<button
											type="button"
											onClick={() => remove(entry.key)}
											className="shrink-0 text-muted-foreground hover:text-foreground"
										>
											<TrashIcon className="size-4" />
										</button>
									</div>
								);
							})}
						</div>
					)}
				</Dropzone>
			</CardContent>
		</Card>
	);
}

function PreviewGridDemo() {
	const { entries, isUploading, upload, remove } = useFileUpload({
		maxSize: 25 * 1024 * 1024,
	});

	const files: DropzoneFile[] = entries.map((e) => ({ id: e.key, file: e.file }));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Grid with Previews</CardTitle>
				<CardDescription>
					Grid layout — image thumbnails and document type cards side by side.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Dropzone
					accept={{
						"image/*": [".png", ".jpg", ".jpeg", ".webp"],
						"application/pdf": [".pdf"],
						"text/*": [".txt", ".csv"],
					}}
					maxFiles={9}
					disabled={isUploading}
					files={files}
					onDrop={(accepted) => upload(accepted)}
					onRemove={(id) => remove(id)}
				>
					<DropzoneContent className="p-4">
						<DropzoneIcon className="size-6" />
						<DropzoneLabel className="text-xs">Drop files here</DropzoneLabel>
					</DropzoneContent>

					{entries.length > 0 && (
						<div className="mt-3 grid grid-cols-3 gap-2">
							{entries.map((entry) => {
								const info = getFileTypeInfo(entry.file);
								const Icon = info.icon;

								return (
									<div
										key={entry.key}
										className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
									>
										{info.isImage ? (
											<>
												{/* biome-ignore lint/performance/noImgElement: demo preview */}
												<img
													src={entry.url ?? URL.createObjectURL(entry.file)}
													alt={entry.file.name}
													className="size-full object-cover"
												/>
												{entry.status === "uploading" && (
													<div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 text-center text-[10px] text-white">
														{entry.progress}%
													</div>
												)}
											</>
										) : (
											<div className="flex size-full flex-col items-center justify-center gap-1 p-2">
												<Icon className={`size-8 ${info.color}`} />
												<span className="text-[10px] font-semibold uppercase tracking-wider">
													{info.label}
												</span>
												<span className="text-[10px] text-muted-foreground">
													{formatFileSize(entry.file.size)}
												</span>
												{entry.status === "uploading" && (
													<span className="text-[10px] text-muted-foreground">
														{entry.progress}%
													</span>
												)}
											</div>
										)}

										<button
											type="button"
											onClick={() => remove(entry.key)}
											className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
										>
											<TrashIcon className="size-3" />
										</button>
									</div>
								);
							})}
						</div>
					)}
				</Dropzone>
			</CardContent>
		</Card>
	);
}

// ── Browse Files ─────────────────────────────────────────────

function FileListDemo() {
	const [prefix, setPrefix] = useState("");
	const { data, isLoading, refetch } = trpc.storage.list.useQuery(
		{ prefix: prefix || undefined },
		{ enabled: false },
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Browse Files</CardTitle>
				<CardDescription>List files in storage by prefix. Requires authentication.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex gap-2">
					<input
						type="text"
						placeholder="Prefix filter (e.g. avatars/)"
						value={prefix}
						onChange={(e) => setPrefix(e.target.value)}
						className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
					/>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						List
					</Button>
				</div>

				{isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}

				{data && (
					<div className="space-y-1">
						{data.items.length === 0 ? (
							<p className="text-muted-foreground text-sm">No files found.</p>
						) : (
							data.items.map((item) => (
								<div
									key={item.key}
									className="flex items-center justify-between rounded border px-3 py-2 text-sm"
								>
									<span className="truncate">{item.key}</span>
									<span className="text-muted-foreground shrink-0 text-xs">
										{item.size > 1024 ? `${(item.size / 1024).toFixed(1)} KB` : `${item.size} B`}
									</span>
								</div>
							))
						)}
						{data.hasMore && (
							<p className="text-muted-foreground text-xs">More files available...</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// ── Helpers ──────────────────────────────────────────────────

function UrlList({ urls }: { urls: string[] }) {
	if (urls.length === 0) return null;
	return (
		<div className="space-y-1">
			<p className="text-xs font-medium text-muted-foreground">Uploaded URLs:</p>
			{urls.map((url) => (
				<code key={url} className="block truncate rounded bg-muted px-2 py-1 text-xs">
					{url}
				</code>
			))}
		</div>
	);
}
