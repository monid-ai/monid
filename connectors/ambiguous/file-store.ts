import type { ConnectionStore } from "./connections.ts";

/** Local ciphertext persistence; hosted deployments supply their durable store. */
export class FileConnectionStore implements ConnectionStore {
    constructor(private readonly directory: string) {}

    async insert(key: string, ciphertext: string): Promise<void> {
        const path = this.path(key);
        await Deno.mkdir(this.directory, { recursive: true, mode: 0o700 });
        const temporary = await Deno.makeTempFile({
            dir: this.directory,
            prefix: ".pending-",
        });
        try {
            const file = await Deno.open(temporary, {
                write: true,
                truncate: true,
                mode: 0o600,
            });
            try {
                const bytes = new TextEncoder().encode(ciphertext);
                let written = 0;
                while (written < bytes.length) {
                    written += await file.write(bytes.subarray(written));
                }
                await file.sync();
            } finally {
                file.close();
            }
            await Deno.link(temporary, path);
        } finally {
            await Deno.remove(temporary);
        }
    }

    async read(key: string): Promise<string | null> {
        try {
            return await Deno.readTextFile(this.path(key));
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) return null;
            throw error;
        }
    }

    async remove(key: string): Promise<void> {
        await Deno.remove(this.path(key));
    }

    private path(key: string): string {
        if (!/^[a-f0-9]{64}$/.test(key)) {
            throw new Error("Invalid connection storage key");
        }
        return `${this.directory}/${key}.json`;
    }
}
