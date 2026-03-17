# Storage Library

Multi-provider file storage with signed URLs.

## Architecture

- **StorageManager** (`lib/storage/storage-manager.ts`) — manages named disks, fake mode for testing
- **StorageDisk** (`lib/storage/storage-disk.ts`) — wraps provider with logging
- **Providers**: `MemoryProvider`, `LocalProvider`, `R2Provider`
- **Config** (`lib/storage/config.ts`) — singleton with conditional R2 init

## Basic Usage

```ts
import { storageManager } from "@/lib/storage";

// Put a file
await storageManager.put("avatars/user-123.png", buffer, {
  contentType: "image/png",
  metadata: { userId: "123" },
});

// Get a file
const file = await storageManager.get("avatars/user-123.png");
if (file) {
  console.log(file.body, file.contentType, file.metadata);
}

// Check existence
const exists = await storageManager.exists("avatars/user-123.png");

// List files
const { items, hasMore, cursor } = await storageManager.list("avatars/");

// Delete
await storageManager.delete("avatars/user-123.png");
```

## Multi-Disk

```ts
// Use specific disk
const r2Disk = storageManager.use("r2");
await r2Disk.put("documents/report.pdf", buffer);

// Default disk from STORAGE_PROVIDER env var
await storageManager.put("key", buffer);
```

## Disk-Level Visibility (Public/Private)

Each disk can be configured as `public: true` or left private (default). This controls how download URLs are generated:

```ts
// config.ts — disk with public: true
const disks = {
  avatars: { provider: "local", public: true },   // public URLs
  documents: { provider: "local" },                // signed URLs (default)
};

// getDownloadUrl automatically picks the right type
const url = await storageManager.use("avatars").getDownloadUrl("user-123.png");
// → /api/storage/files/user-123.png (public, no token)

const url = await storageManager.use("documents").getDownloadUrl("report.pdf");
// → /api/storage/serve?token=... (signed, expires)
```

The public file serving route (`/api/storage/files/`) validates that only public disks can be accessed through it — private disks return 403.

**When to use which method:**

| Method | Use case |
|---|---|
| `getDownloadUrl(key, expiresIn?)` | Preferred — auto-selects public or signed based on disk config |
| `getPublicUrl(key)` | Force a public URL regardless of disk config |
| `getSignedUrl(key, expiresIn)` | Force a signed URL regardless of disk config |

## Signed URLs

```ts
// Presigned GET URL (for private file access)
const downloadUrl = await storageManager.getSignedUrl("private/doc.pdf", 3600);

// Presigned PUT URL (for client-side uploads)
const uploadUrl = await storageManager.putSignedUrl("uploads/photo.jpg", {
  contentType: "image/jpeg",
  maxSize: 5 * 1024 * 1024,
  expiresIn: 600,
});
```

## Public URLs

For files that don't need auth (avatars, public images, assets):

```ts
// Get a permanent public URL (no token, no expiration)
const url = storageManager.getPublicUrl("avatars/user-123.png");
// Local:  /api/storage/files/avatars/user-123.png
// R2:     https://cdn.example.com/avatars/user-123.png (requires R2_PUBLIC_URL)

// Use in <img>, <video>, or anywhere
<img src={storageManager.getPublicUrl("avatars/user-123.png")} />
```

## Private File Access Pattern

Auth check, then generate short-lived signed URL:

```ts
// In a tRPC procedure
const file = protectedQuery
  .input(z.object({ key: z.string() }))
  .query(async ({ input, ctx }) => {
    // Auth check
    if (!canAccess(ctx.session, input.key)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    // Short-lived signed URL
    return storageManager.getSignedUrl(input.key, 300);
  });
```

---

## Upload UI — Three Layers

The upload system has 3 independent layers that can be used separately or together:

```
┌─────────────────────────────────────────────┐
│  FileUpload (components/file-upload.tsx)     │  ← Ready-to-use, opinionated
│  ┌───────────────────────────────────────┐   │
│  │  useFileUpload (hooks/use-file-upload)│   │  ← Upload logic (presigned URLs, progress)
│  │  ┌─────────────────────────────────┐  │   │
│  │  │  Dropzone (components/ui/)      │  │   │  ← Pure UI (drag & drop, file list)
│  │  └─────────────────────────────────┘  │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Layer 1: Dropzone UI (`components/ui/dropzone.tsx`)

Pure composition-based UI. No upload logic, no tRPC dependency. Just drag & drop and file display.

**Components:**

| Component | Purpose |
|---|---|
| `Dropzone` | Root provider — accepts `files`, `onDrop`, `onRemove` |
| `DropzoneContent` | The drop area (click/drag target) |
| `DropzoneIcon` | Upload icon (customizable via `className`) |
| `DropzoneLabel` | Main text ("Drag & drop files here") |
| `DropzoneDescription` | Secondary text ("PNG, JPG up to 5MB") |
| `DropzoneList` | File list container (auto-hides when empty) |
| `DropzoneListItem` | Single file row (name, size, progress bar, remove button, error state) |

**Minimal example:**

```tsx
const [files, setFiles] = useState<DropzoneFile[]>([]);

<Dropzone
  accept={{ "image/*": [".png", ".jpg"] }}
  maxSize={5 * 1024 * 1024}
  files={files}
  onDrop={(accepted) => {
    setFiles(prev => [...prev, ...accepted.map((f, i) => ({ id: `${Date.now()}-${i}`, file: f }))]);
  }}
  onRemove={(id) => setFiles(prev => prev.filter(f => f.id !== id))}
>
  <DropzoneContent>
    <DropzoneIcon />
    <DropzoneLabel />
    <DropzoneDescription>PNG, JPG up to 5MB</DropzoneDescription>
  </DropzoneContent>
  <DropzoneList>
    {files.map(f => <DropzoneListItem key={f.id} file={f} />)}
  </DropzoneList>
</Dropzone>
```

**Customizing styles — every component takes `className`:**

```tsx
// Compact horizontal layout
<DropzoneContent className="flex-row gap-4 p-4 rounded-md border-solid">
  <DropzoneIcon className="size-5 text-primary" />
  <div>
    <DropzoneLabel className="text-xs">Choose file</DropzoneLabel>
    <DropzoneDescription>Max 2MB</DropzoneDescription>
  </div>
</DropzoneContent>

// Full-height hero area
<DropzoneContent className="min-h-[300px] rounded-2xl bg-muted/30 border-primary/20">
  <DropzoneIcon className="size-16 text-primary/50" />
  <DropzoneLabel className="text-2xl font-bold">Drop your course content</DropzoneLabel>
</DropzoneContent>

// Custom file items
<DropzoneListItem file={f} className="rounded-lg bg-muted/50 border-none px-4 py-3" />
```

**Using your own icon:**

```tsx
import { ImageIcon } from "lucide-react";

<DropzoneContent>
  <ImageIcon className="size-10 text-blue-400" />  {/* Any icon, not just DropzoneIcon */}
  <DropzoneLabel>Upload images</DropzoneLabel>
</DropzoneContent>
```

**Building your own file list (skip DropzoneList/DropzoneListItem entirely):**

```tsx
<Dropzone files={files} onDrop={handleDrop} onRemove={handleRemove}>
  <DropzoneContent>
    <DropzoneIcon />
    <DropzoneLabel />
  </DropzoneContent>

  {/* Your own custom list UI */}
  <div className="grid grid-cols-3 gap-2">
    {files.map(f => (
      <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
        <img src={URL.createObjectURL(f.file)} alt="" className="object-cover size-full" />
        <button onClick={() => handleRemove(f.id)} className="absolute top-1 right-1">×</button>
      </div>
    ))}
  </div>
</Dropzone>
```

### Layer 2: useFileUpload Hook (`hooks/use-file-upload.ts`)

Upload logic with presigned URLs, XHR progress tracking, abort support. No UI dependency.

```tsx
import { useFileUpload } from "@/hooks/use-file-upload";

const { entries, isUploading, upload, remove, clear } = useFileUpload({
  disk: "documents",
  maxSize: 10 * 1024 * 1024,
  onSuccess: (file, url) => console.log("Uploaded:", url),
  onError: (file, error) => console.error("Failed:", error),
});

// entries: FileUploadEntry[]
// Each entry has: { key, file, status, progress, url?, error? }
// status: "idle" | "uploading" | "success" | "error"
// progress: 0-100
```

**Upload flow per file:**
1. `generateKey()` → `photo-1710612345678.jpg`
2. Client-side validation (size, type)
3. `trpc.storage.createUploadUrl` → presigned PUT URL
4. XHR PUT to presigned URL (with progress tracking)
5. `trpc.storage.createDownloadUrl` → signed GET URL
6. Updates entry with `status: "success"` and `url`

**Connect hook to any UI — not just Dropzone:**

```tsx
function CustomUpload() {
  const { entries, upload, remove } = useFileUpload({ disk: "avatars" });

  return (
    <div>
      <input type="file" onChange={(e) => {
        if (e.target.files) upload([...e.target.files]);
      }} />

      {entries.map(entry => (
        <div key={entry.key}>
          {entry.file.name} — {entry.status} — {entry.progress}%
          <button onClick={() => remove(entry.key)}>×</button>
        </div>
      ))}
    </div>
  );
}
```

**Connect hook to Dropzone UI manually:**

```tsx
function AvatarUpload({ onComplete }: { onComplete: (url: string) => void }) {
  const { entries, isUploading, upload, remove } = useFileUpload({
    disk: "avatars",
    maxSize: 2 * 1024 * 1024,
    onSuccess: (_file, url) => onComplete(url),
  });

  const files: DropzoneFile[] = entries.map(e => ({ id: e.key, file: e.file }));

  return (
    <Dropzone
      accept={{ "image/*": [".png", ".jpg"] }}
      maxFiles={1}
      multiple={false}
      disabled={isUploading}
      files={files}
      onDrop={(accepted) => upload(accepted)}
      onRemove={(id) => remove(id)}
    >
      <DropzoneContent className="rounded-full size-32 p-0 border-solid">
        <DropzoneIcon className="size-6" />
      </DropzoneContent>

      {entries.map(entry => (
        <div key={entry.key} className="text-center text-xs">
          {entry.status === "uploading" && `${entry.progress}%`}
          {entry.status === "success" && "Uploaded!"}
          {entry.error && <span className="text-destructive">{entry.error}</span>}
        </div>
      ))}
    </Dropzone>
  );
}
```

### Layer 3: FileUpload Component (`components/file-upload.tsx`)

Ready-to-use component that wires Dropzone + useFileUpload together. Use when you don't need custom UI.

```tsx
import { FileUpload } from "@/components/file-upload";

// Simple avatar upload
<FileUpload
  accept={{ "image/*": [".png", ".jpg"] }}
  maxFiles={1}
  maxSize={2 * 1024 * 1024}
  label="Upload avatar"
  description="PNG or JPG, max 2MB"
  onUploadComplete={(urls) => form.setValue("avatar", urls[0])}
/>

// Multi-file document upload
<FileUpload
  disk="documents"
  accept={{ "application/pdf": [".pdf"] }}
  maxFiles={10}
  maxSize={25 * 1024 * 1024}
  label="Upload documents"
  description="PDF files, up to 25MB each"
  onUploadComplete={(urls) => setDocuments(urls)}
/>
```

**When to use which:**

| Need | Use |
|---|---|
| Standard upload form | `FileUpload` |
| Custom upload UI (avatar circle, image grid, inline button) | `useFileUpload` + your own JSX |
| Custom upload UI with drag & drop | `useFileUpload` + `Dropzone` components |
| File picker without upload (form preview, client-side processing) | `Dropzone` components only |

---

## Testing with FakeDisk

```ts
const fake = storageManager.fake();

// Seed test data
await fake.seed("test/file.txt", Buffer.from("hello"));

// Run code that uses storage...

// Assertions
await fake.assertExists("test/file.txt");
await fake.assertMissing("test/other.txt");
await fake.assertCount(1, "test/");

// Cleanup
storageManager.restore();
```

## Next.js Image with R2

Set `R2_PUBLIC_URL` env var. The hostname is auto-extracted in `next.config.js` for `remotePatterns`:

```tsx
import Image from "next/image";

// R2_PUBLIC_URL=https://cdn.miapp.com
<Image src="https://cdn.miapp.com/avatars/user.jpg" alt="Avatar" width={64} height={64} />
```

## Environment Variables

```
STORAGE_PROVIDER=local|r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=...         # Optional: public bucket URL (hostname auto-extracted for next/image)
```

## tRPC Storage Router

Available procedures (all require auth):

- `storage.createUploadUrl` — presigned PUT URL
- `storage.createDownloadUrl` — presigned GET URL
- `storage.list` — list files by prefix
- `storage.delete` — delete a file

## Health Check

`health.storage` — tests put/get/delete cycle, reports provider and latency.

## Demo Page

`/dev/storage` — interactive examples of all Dropzone variants, FileUpload, hook usage, health check, and file browser.
