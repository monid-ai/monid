import { z } from "zod";
import { directTransport, type Transport } from "@monid/connector-engine";
import { type SignupInput, signupInput } from "./schema/signup.ts";

const ORIGIN = "https://app.ambiguous.ai";
const uuid = z.uuid();
const credential = z.string().regex(/^ak_[A-Za-z0-9_-]+$/);
const identity = z.object({
    id: uuid,
    workspace_id: uuid,
    workspace_name: z.string().nullable(),
    display_name: z.string(),
    type: z.enum(["human", "agent"]),
});
const summary = z.object({
    id: uuid,
    userId: uuid,
    workspaceId: uuid,
    workspaceName: z.string().nullable(),
    displayName: z.string(),
    principalType: z.enum(["human", "agent"]),
});
const stored = z.object({ connection: summary, apiKey: credential });
const envelope = z.object({
    version: z.literal(1),
    iv: z.array(z.number().int().min(0).max(255)).length(12),
    ciphertext: z.array(z.number().int().min(0).max(255)),
});

export type Connection = z.infer<typeof summary>;

/** A durable host store for ciphertext; insert must refuse an existing key. */
export interface ConnectionStore {
    insert(key: string, ciphertext: string): Promise<void>;
    read(key: string): Promise<string | null>;
    remove(key: string): Promise<void>;
}

export class ConnectionError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
        this.name = "ConnectionError";
    }
}

/**
 * Host-side onboarding and credential custody, outside tool inputs and run
 * results. scopeKey must come from the authenticated host session, never from
 * caller-supplied tool arguments. Use a persistent AES-256-GCM key and store.
 */
export class AmbiguousConnections {
    constructor(
        private readonly store: ConnectionStore,
        private readonly encryptionKey: CryptoKey,
        private readonly fetcher: typeof fetch = fetch,
    ) {
        const algorithm = encryptionKey.algorithm as AesKeyAlgorithm;
        if (
            algorithm.name !== "AES-GCM" || algorithm.length !== 256 ||
            !encryptionKey.usages.includes("encrypt") ||
            !encryptionKey.usages.includes("decrypt")
        ) {
            throw new ConnectionError(
                "An AES-256-GCM encryption key is required",
            );
        }
    }

    async create(
        scopeKey: string,
        input: SignupInput,
    ): Promise<Connection & { claimEmailSent: boolean }> {
        this.validateScope(scopeKey);
        const body = signupInput.parse(input);
        const result = await this.request("/api/auth/signup-agent", {
            method: "POST",
            body: JSON.stringify(body),
        });
        const parsed = z.object({
            api_key: credential,
            agent: z.object({ id: uuid, display_name: z.string() }),
            workspace: z.object({ id: uuid, name: z.string() }),
            human: z.object({ claim_token_sent: z.boolean() }),
        }).safeParse(result);
        if (!parsed.success) {
            throw new ConnectionError(
                "Ambiguous returned an invalid signup response",
            );
        }
        const connection = await this.save(scopeKey, parsed.data.api_key, {
            id: parsed.data.agent.id,
            workspace_id: parsed.data.workspace.id,
            workspace_name: parsed.data.workspace.name,
            display_name: parsed.data.agent.display_name,
            type: "agent",
        });
        return {
            ...connection,
            claimEmailSent: parsed.data.human.claim_token_sent,
        };
    }

    async connectSetupCode(
        scopeKey: string,
        code: string,
        expectedWorkspaceId?: string,
    ): Promise<Connection> {
        this.validateScope(scopeKey);
        if (!/^ahc_[A-Za-z0-9_-]{43}$/.test(code)) {
            throw new ConnectionError("Invalid Ambiguous setup code");
        }
        if (expectedWorkspaceId !== undefined) uuid.parse(expectedWorkspaceId);
        const result = await this.request("/api/auth/key-handoff/exchange", {
            method: "POST",
            body: JSON.stringify({ code }),
        });
        const parsed = z.object({ token: credential }).safeParse(result);
        if (!parsed.success) {
            throw new ConnectionError(
                "Ambiguous returned an invalid setup response",
            );
        }
        return this.connectToken(
            scopeKey,
            parsed.data.token,
            expectedWorkspaceId,
        );
    }

    /** Accepts an API key or the bearer returned by a completed OAuth exchange. */
    async connectToken(
        scopeKey: string,
        apiKey: string,
        expectedWorkspaceId?: string,
    ): Promise<Connection> {
        this.validateScope(scopeKey);
        if (!credential.safeParse(apiKey).success) {
            throw new ConnectionError("Invalid Ambiguous credential");
        }
        if (expectedWorkspaceId !== undefined) uuid.parse(expectedWorkspaceId);
        const result = await this.request("/api/users/me", {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        const parsed = identity.safeParse(result);
        if (!parsed.success) {
            throw new ConnectionError(
                "Ambiguous identity has no valid workspace",
            );
        }
        if (
            expectedWorkspaceId !== undefined &&
            parsed.data.workspace_id !== expectedWorkspaceId
        ) {
            throw new ConnectionError(
                "Ambiguous workspace does not match the selection",
            );
        }
        return this.save(scopeKey, apiKey, parsed.data);
    }

    async get(scopeKey: string, connectionId: string): Promise<Connection> {
        return (await this.load(scopeKey, connectionId)).connection;
    }

    /** Disconnects Monid without deleting the workspace or revoking a shared key. */
    async disconnect(scopeKey: string, connectionId: string): Promise<void> {
        await this.load(scopeKey, connectionId);
        await this.store.remove(await this.storageKey(scopeKey, connectionId));
    }

    transport(scopeKey: string, connectionId: string): Transport {
        this.validateScope(scopeKey);
        uuid.parse(connectionId);
        const transport = directTransport({
            params: async (provider) => {
                if (provider !== "ambiguous") {
                    throw new ConnectionError(
                        "Wrong provider for this connection",
                    );
                }
                const saved = await this.load(scopeKey, connectionId);
                return { apiKey: saved.apiKey };
            },
            fetch: this.fetcher,
        });
        return {
            execute: async (request) => {
                const url = new URL(request.url);
                if (
                    request.provider !== "ambiguous" || !request.auth ||
                    url.origin !== ORIGIN || url.username || url.password ||
                    !url.pathname.startsWith("/api/")
                ) {
                    throw new ConnectionError(
                        "Request is outside the Ambiguous connection",
                    );
                }
                return await transport.execute(request);
            },
        };
    }

    private async save(
        scopeKey: string,
        apiKey: string,
        user: z.infer<typeof identity>,
    ): Promise<Connection> {
        const connection: Connection = {
            id: crypto.randomUUID(),
            userId: user.id,
            workspaceId: user.workspace_id,
            workspaceName: user.workspace_name,
            displayName: user.display_name,
            principalType: user.type,
        };
        const key = await this.storageKey(scopeKey, connection.id);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv,
                additionalData: new TextEncoder().encode(key),
            },
            this.encryptionKey,
            new TextEncoder().encode(JSON.stringify({ connection, apiKey })),
        );
        await this.store.insert(
            key,
            JSON.stringify({
                version: 1,
                iv: Array.from(iv),
                ciphertext: Array.from(new Uint8Array(ciphertext)),
            }),
        );
        return connection;
    }

    private async load(scopeKey: string, connectionId: string) {
        const key = await this.storageKey(scopeKey, connectionId);
        const raw = await this.store.read(key);
        if (raw === null) {
            throw new ConnectionError("Connection not found", 404);
        }
        try {
            const encrypted = envelope.parse(JSON.parse(raw));
            const plaintext = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: new Uint8Array(encrypted.iv),
                    additionalData: new TextEncoder().encode(key),
                },
                this.encryptionKey,
                new Uint8Array(encrypted.ciphertext),
            );
            const parsed = stored.parse(
                JSON.parse(new TextDecoder().decode(plaintext)),
            );
            if (parsed.connection.id !== connectionId) {
                throw new Error("Identity mismatch");
            }
            return parsed;
        } catch {
            throw new ConnectionError("Connection could not be decrypted");
        }
    }

    private validateScope(scopeKey: string): void {
        if (typeof scopeKey !== "string" || !scopeKey.trim()) {
            throw new ConnectionError(
                "An authenticated host scope is required",
            );
        }
    }

    private async storageKey(
        scopeKey: string,
        connectionId: string,
    ): Promise<string> {
        this.validateScope(scopeKey);
        uuid.parse(connectionId);
        const bytes = new TextEncoder().encode(
            JSON.stringify(["ambiguous", scopeKey, connectionId]),
        );
        const digest = new Uint8Array(
            await crypto.subtle.digest("SHA-256", bytes),
        );
        return Array.from(
            digest,
            (value) => value.toString(16).padStart(2, "0"),
        ).join("");
    }

    private async request(
        path: string,
        init: RequestInit = {},
    ): Promise<unknown> {
        let response: Response;
        try {
            response = await this.fetcher(`${ORIGIN}${path}`, {
                ...init,
                headers: {
                    "Content-Type": "application/json",
                    "API-Version": "1",
                    ...init.headers,
                },
                redirect: "error",
                signal: AbortSignal.timeout(30_000),
            });
        } catch {
            throw new ConnectionError(
                "Ambiguous connection request failed; it was not retried",
            );
        }
        if (!response.ok) {
            await response.body?.cancel();
            throw new ConnectionError(
                `Ambiguous returned HTTP ${response.status}`,
                response.status,
            );
        }
        try {
            return await response.json();
        } catch {
            throw new ConnectionError("Ambiguous returned invalid JSON");
        }
    }
}
