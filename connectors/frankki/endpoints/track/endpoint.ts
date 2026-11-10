import { defineEndpoint } from "@shared/core";
import { zFrankkiTrackBody } from "./schema/inputs.ts";

/** FrankKi Track: `POST .../letter/track`. Reads one order. */
export default defineEndpoint({
    meta: {
        displayName: "FrankKi Track Letter",
        summary: "Status of a paid letter by its tracking token.",
        description: "Look up a letter's postal status with the " +
            "trackingToken from frankki#compose. Returns 'status', the " +
            "carrier 'tracking_code' for tracked and registered mail, and " +
            "'updated_at'. Typical statuses are pending_payment, " +
            "processing, printed, shipped, delivered, and failed; an " +
            "unpaid letter answers not_found.",
        docsUrl: "https://frankki.app/en/developers",
        categories: ["postal-mail"],
    },
    endpoint: "/track",
    request: { method: "POST", path: "/track" },
    input: { schema: { body: zFrankkiTrackBody } },
    timeouts: { requestMs: 10_000, runMs: 15_000 },
});
