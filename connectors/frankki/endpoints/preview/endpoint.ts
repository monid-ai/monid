import { defineEndpoint } from "@shared/core";
import { zFrankkiPreviewBody } from "./schema/inputs.ts";

/** FrankKi Preview: `POST .../letter/preview`. Reads a draft. */
export default defineEndpoint({
    meta: {
        displayName: "FrankKi Preview Letter",
        summary: "Rendered page images of a letter draft, for the user to " +
            "check.",
        description: "Get the rendered pages of a draft as short-lived " +
            "image URLs, plus the delivery method, 'quoteCents' as the price " +
            "in euro cents, and the estimated delivery range. Show the pages to " +
            "the user and let them confirm the text, the addresses, and " +
            "the price before frankki#checkout. 'previewReady' must be " +
            "true; checkout refuses a draft without a preview.",
        docsUrl: "https://frankki.app/en/developers",
        categories: ["postal-mail"],
        notes: [
            "Page image URLs expire after a short time; preview again for " +
            "fresh ones.",
        ],
    },
    endpoint: "/preview",
    request: { method: "POST", path: "/preview" },
    input: { schema: { body: zFrankkiPreviewBody } },
    timeouts: { requestMs: 30_000, runMs: 35_000 },
});
