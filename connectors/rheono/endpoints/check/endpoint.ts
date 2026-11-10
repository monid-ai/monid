import { defineEndpoint } from "@shared/core";
import { zCheckAppBody } from "./schema/inputs.ts";

/**
 * Rheono Check — `POST https://rheono.dev/api/check-app`.
 *
 * The instant read-only posture pass. Answers in a few seconds with the TLS
 * handshake result, header and cookie findings, and the conventional paths
 * that answered. FREE: usage falls back to the provider's FREE model, so
 * nothing folds and nothing is evidenced.
 */
export default defineEndpoint({
    meta: {
        displayName: "Rheono Check",
        summary: "Instant read-only security posture check on a live URL.",
        description: "Shallow read-only pass against a live URL and returns " +
            "what is exposed right now: TLS certificate state, missing or " +
            "weakened security headers, cookie flags, server version " +
            "disclosure, and conventionally exposed admin, debug and " +
            "environment paths — each finding with an id, a severity " +
            "(high, medium, low, info), a title and a detail line, plus a " +
            "one-paragraph summary in plain words. Use when someone asks " +
            "whether a site, app or API is secure, ready to launch, or " +
            "safe to hand over. Answers in a few seconds and probes nothing " +
            "that changes state. This endpoint does not email anyone and " +
            "does not start a deeper scan — reach for rheono#request-pentest " +
            "when the caller wants the researcher-run report.",
        docsUrl: "https://rheono.dev/docs/check-api",
        categories: ["security"],
        notes: [
            "The per-client rate budget is shared with the MCP check tool on " +
            "rheono.dev — a 429 here counts calls made there too.",
        ],
    },
    endpoint: "/check",
    request: { method: "POST", path: "/api/check-app" },
    input: { schema: { body: zCheckAppBody } },
});
