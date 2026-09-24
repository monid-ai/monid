import type { EndpointDoc, RunInput } from "@shared/core";

/** Hosts use this copy for logs/history; the original input is used only for execution. */
export function redactRunInput(doc: EndpointDoc, input: RunInput): RunInput {
    const safe = structuredClone(input);
    for (const path of doc.input.sensitive ?? []) {
        const parts = path.replace(/^\$\./, "").split(".");
        let parent: unknown = safe;
        for (const part of parts.slice(0, -1)) {
            parent = parent && typeof parent === "object"
                ? (parent as Record<string, unknown>)[part]
                : undefined;
        }
        const key = parts.at(-1)!;
        if (
            parent && typeof parent === "object" && Object.hasOwn(parent, key)
        ) (parent as Record<string, unknown>)[key] = "[redacted]";
    }
    return safe;
}
