import type { HttpRequestParts } from "@shared/core";
import type { PreparedRequest } from "./interfaces/mod.ts";
import { EngineError, EngineErrorCode } from "./errors.ts";

export function encodeBody(
    request: PreparedRequest,
    parts: HttpRequestParts,
): BodyInit | undefined {
    if (parts.body === undefined) return undefined;
    if (request.bodyEncoding !== "multipart") return JSON.stringify(parts.body);
    if (
        !parts.body || typeof parts.body !== "object" ||
        Array.isArray(parts.body)
    ) {
        throw new EngineError(
            EngineErrorCode.INVALID_INPUT,
            "Multipart body must be an object",
        );
    }
    const form = new FormData();
    const files = new Set(request.fileFields ?? []);
    for (const [name, value] of Object.entries(parts.body)) {
        if (value === null) continue;
        if (files.has(name)) {
            if (
                !value || typeof value !== "object" || Array.isArray(value) ||
                typeof value.dataBase64 !== "string" ||
                typeof value.filename !== "string"
            ) {
                throw new EngineError(
                    EngineErrorCode.INVALID_INPUT,
                    "File requires filename and dataBase64",
                );
            }
            let bytes: Uint8Array<ArrayBuffer>;
            try {
                if (value.dataBase64.length > 140_000_000) throw new Error();
                bytes = Uint8Array.from(
                    atob(value.dataBase64),
                    (c) => c.charCodeAt(0),
                );
            } catch {
                throw new EngineError(
                    EngineErrorCode.INVALID_INPUT,
                    "Invalid or oversized base64 file",
                );
            }
            const contentType = typeof value.contentType === "string"
                ? value.contentType
                : "application/octet-stream";
            form.append(
                name,
                new Blob([bytes], { type: contentType }),
                value.filename,
            );
        } else {
            form.append(
                name,
                typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value),
            );
        }
    }
    return form;
}

export async function decodeBody(
    response: Response,
    request: PreparedRequest,
): Promise<string> {
    const type = response.headers.get("content-type") ?? "";
    const automatic = request.responseEncoding === "auto";
    if (
        !response.ok || (!automatic && request.responseEncoding !== "base64") ||
        (automatic &&
            (/json|text\/event-stream/i.test(type) || response.status === 204 ||
                response.status === 205))
    ) return response.text();
    const bytes = new Uint8Array(await response.arrayBuffer());
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 32768) {
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + 32768)));
    }
    return JSON.stringify({
        dataBase64: btoa(chunks.join("")),
        contentType: response.headers.get("content-type") ??
            "application/octet-stream",
        contentDisposition: response.headers.get("content-disposition"),
    });
}
