import { join } from "@std/path";
import { z } from "zod";
import type { CredentialStore } from "@monid/connector-engine";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";
import { OUTPUT_DIR } from "../lib.ts";

const encryptedRecord = z.object({
    iv: z.array(z.number().int().min(0).max(255)).length(12),
    ciphertext: z.array(z.number().int().min(0).max(255)),
});
const credentialParams = z.record(z.string(), z.string().min(1));

/** Local implementation of the Relay's caller-bound secret store; the engine remains persistence-free. */
export class FileCredentialStore implements CredentialStore {
    constructor(
        private readonly directory: string,
        private readonly key: CryptoKey,
        private readonly scope: string,
    ) {
        const algorithm = key.algorithm as AesKeyAlgorithm;
        if (
            !scope.trim() || algorithm.name !== "AES-GCM" ||
            algorithm.length !== 256 || !key.usages.includes("encrypt") ||
            !key.usages.includes("decrypt")
        ) {
            throw new Error("A host scope and AES-256-GCM key are required");
        }
    }

    async capture(
        provider: string,
        origin: string,
        params: Record<string, string>,
    ): Promise<string> {
        const reference = crypto.randomUUID();
        const address = await this.address(provider, origin, reference);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv, additionalData: address.aad },
            this.key,
            new TextEncoder().encode(
                JSON.stringify(credentialParams.parse(params)),
            ),
        );
        await Deno.mkdir(this.directory, { recursive: true, mode: 0o700 });
        const temporary = await Deno.makeTempFile({
            dir: this.directory,
            prefix: ".pending-",
        });
        try {
            await Deno.writeTextFile(
                temporary,
                JSON.stringify({
                    iv: Array.from(iv),
                    ciphertext: Array.from(new Uint8Array(encrypted)),
                }),
            );
            const file = await Deno.open(temporary, { write: true });
            try {
                await file.sync();
            } finally {
                file.close();
            }
            await Deno.link(temporary, address.path);
        } finally {
            await Deno.remove(temporary);
        }
        return reference;
    }

    async resolve(
        provider: string,
        origin: string,
        reference: string,
    ): Promise<Record<string, string>> {
        const address = await this.address(provider, origin, reference);
        try {
            const encrypted = encryptedRecord.parse(
                JSON.parse(await Deno.readTextFile(address.path)),
            );
            const decoded = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: new Uint8Array(encrypted.iv),
                    additionalData: address.aad,
                },
                this.key,
                new Uint8Array(encrypted.ciphertext),
            );
            return credentialParams.parse(
                JSON.parse(new TextDecoder().decode(decoded)),
            );
        } catch {
            throw new EngineError(
                EngineErrorCode.MISSING_CREDENTIAL,
                "Connection credential is unavailable in this host scope",
            );
        }
    }

    async forget(
        provider: string,
        origin: string,
        reference: string,
    ): Promise<void> {
        const address = await this.address(provider, origin, reference);
        try {
            await Deno.remove(address.path);
        } catch (error) {
            if (!(error instanceof Deno.errors.NotFound)) throw error;
        }
    }

    private async address(provider: string, origin: string, reference: string) {
        if (!z.uuid().safeParse(reference).success) {
            throw new EngineError(
                EngineErrorCode.MISSING_CREDENTIAL,
                "Invalid credential reference",
            );
        }
        const aad = new TextEncoder().encode(
            JSON.stringify([this.scope, provider, origin, reference]),
        );
        const digest = new Uint8Array(
            await crypto.subtle.digest("SHA-256", aad),
        );
        const name = Array.from(
            digest,
            (byte) => byte.toString(16).padStart(2, "0"),
        ).join("");
        return { aad, path: join(this.directory, `${name}.json`) };
    }
}

export async function localCredentialStore(
    scope: string,
): Promise<CredentialStore | undefined> {
    const hex = Deno.env.get("MONID_CREDENTIAL_STORE_KEY");
    if (hex === undefined) return undefined;
    if (!/^[a-fA-F0-9]{64}$/.test(hex)) {
        throw new Error(
            "MONID_CREDENTIAL_STORE_KEY must contain 64 hex characters",
        );
    }
    const key = await crypto.subtle.importKey(
        "raw",
        new Uint8Array(hex.match(/../g)!.map((byte) => parseInt(byte, 16))),
        "AES-GCM",
        false,
        ["encrypt", "decrypt"],
    );
    return new FileCredentialStore(join(OUTPUT_DIR, "credentials"), key, scope);
}
