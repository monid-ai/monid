import { defineEndpoint } from "@shared/core";
import { zFrankkiComposeBody } from "./schema/inputs.ts";

/** FrankKi Compose: `POST .../letter/compose`. Stores a private draft. */
export default defineEndpoint({
    meta: {
        displayName: "FrankKi Compose Letter",
        summary: "Write a letter draft and render it as a PDF.",
        description: "Create or revise a letter draft: subject, body text, " +
            "sender and recipient address, delivery method, colour. " +
            "FrankKi lays it out as a DIN 5008 business letter that fits a " +
            "window envelope, renders the PDF, and returns a private " +
            "draftToken, the rendered page count, and the price. A new " +
            "letter also returns a trackingToken; keep it for " +
            "frankki#track. Pass the draftToken again to revise the same " +
            "draft. Nothing is charged or posted. Next: frankki#preview.",
        docsUrl: "https://frankki.app/en/developers",
        categories: ["postal-mail"],
        notes: [
            "Text that FrankKi will not print (threats, harassment, fraud, " +
            "impersonation) is refused here with CONTENT_REJECTED (422).",

            "Attachments are not available through this connector.",
        ],
    },
    endpoint: "/compose",
    request: { method: "POST", path: "/compose" },
    input: { schema: { body: zFrankkiComposeBody } },
    timeouts: { requestMs: 45_000, runMs: 50_000 },
});
