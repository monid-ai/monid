import { defineEndpoint } from "@shared/core";
import { zMaildignityCheckBody } from "./schema/inputs.ts";

/**
 * `POST /check` — Audit an email draft for tone, presumptuousness, and pushiness.
 */
export default defineEndpoint({
    meta: {
        displayName: "Audit Email Draft",
        summary: "Audit an email draft for tone, pushiness, and artificial phrasing.",
        description: "Evaluates an email draft against dignity and communication " +
            "standards. Returns an audit verdict (PASS, REVIEW, FAIL), a summary, " +
            "identified issues with specific quotes and rewrites, and a fully " +
            "repaired email body when applicable.",
        docsUrl: "https://maildignity.com/docs",
        categories: ["agents"],
        notes: [
            "Costs 1 check credit per audit call.",
            "mode defaults to 'full'.",
        ],
    },
    request: { method: "POST", path: "/check" },
    input: {
        schema: {
            body: zMaildignityCheckBody.extend({
                mode: zMaildignityCheckBody.shape.mode.unwrap().default("full"),
            }),
        },
    },
});
