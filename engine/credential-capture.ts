import type { Json } from "@shared/core";
import type { CredentialStore, PreparedRequest } from "./interfaces/mod.ts";
import { EngineError, EngineErrorCode } from "./errors.ts";

/** Runs at the credential boundary, before any response reaches engine hooks or run history. */
export async function captureCredentials(
    request: PreparedRequest,
    status: number,
    raw: string,
    store: CredentialStore,
): Promise<string> {
    const capture = request.auth?.capture;
    if (!capture) return raw;
    const success = status >= 200 && status < 300;
    if (!success) {
        return JSON.stringify({ error: "Credential exchange failed", status });
    }
    try {
        const output = JSON.parse(raw);
        if (
            !output || typeof output !== "object" || Array.isArray(output) ||
            "credentialRef" in output
        ) throw new Error();
        const params: Record<string, string> = {};
        for (const [field, source] of Object.entries(capture.fields)) {
            if (
                !Object.hasOwn(output, source) ||
                typeof output[source] !== "string" || !output[source]
            ) throw new Error();
            params[field] = output[source];
        }
        const secrets = Object.values(params);
        const hidden = new Set(Object.values(capture.fields));
        const sanitize = (value: Json): Json => {
            if (typeof value === "string") {
                for (const secret of secrets) {
                    value = value.replaceAll(secret, "[redacted]");
                }
                return value;
            }
            if (Array.isArray(value)) return value.map(sanitize);
            if (value && typeof value === "object") {
                return Object.fromEntries(
                    Object.entries(value).filter(([key]) => !hidden.has(key))
                        .map(([key, item]) => [key, sanitize(item)]),
                );
            }
            return value;
        };
        const clean = sanitize(output) as Record<string, Json>;
        const reference = await store.capture(
            request.provider,
            new URL(request.url).origin,
            params,
        );
        return JSON.stringify({ ...clean, credentialRef: reference });
    } catch {
        throw new EngineError(
            EngineErrorCode.CREDENTIAL_CAPTURE_FAILED,
            "Credential exchange may have committed; reconcile before retrying",
        );
    }
}
