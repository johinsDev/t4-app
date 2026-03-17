import { MemoryProvider } from "./providers/memory";
import { StorageDisk } from "./storage-disk";

export class FakeDisk extends StorageDisk {
	readonly #memoryProvider: MemoryProvider;

	constructor() {
		const provider = new MemoryProvider();
		super("fake", provider, "silent", false);
		this.#memoryProvider = provider;
	}

	async seed(key: string, body: Buffer | Uint8Array | string): Promise<this> {
		await this.put(key, body);
		return this;
	}

	async assertExists(key: string): Promise<this> {
		const found = await this.exists(key);
		if (!found) {
			throw new Error(`Expected file "${key}" to exist`);
		}
		return this;
	}

	async assertMissing(key: string): Promise<this> {
		const found = await this.exists(key);
		if (found) {
			throw new Error(`Expected file "${key}" to not exist`);
		}
		return this;
	}

	async assertCount(n: number, prefix?: string): Promise<this> {
		const { items } = await this.list(prefix);
		if (items.length !== n) {
			throw new Error(
				`Expected ${n} file(s)${prefix ? ` with prefix "${prefix}"` : ""}, got ${items.length}`,
			);
		}
		return this;
	}

	clear(): void {
		this.#memoryProvider.files.clear();
	}
}
