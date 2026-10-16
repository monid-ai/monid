import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLev8ContactSearchBody } from "./schema/inputs.ts";

/**
 * POST /v1/contact-search — one email address or phone number.
 *
 * Billed only when found: `result.content` non-empty after trimming. The
 * price follows the REQUESTED `contact_type` — email 10, phone 30 — so two
 * lines, one selected per call (design D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Lev8 Contact Search",
        summary: "Find one person's email address or phone number.",
        description: "Find the email address or phone number of one " +
            "contact from a natural-language description of who they " +
            "are. Name the person and their role or company, and add " +
            "identity signals — a LinkedIn URL, website, or X, YouTube, " +
            "TikTok, Instagram or GitHub handle — to improve the match. " +
            "Returns the contact in `result.content` with a supporting " +
            "`result.reference`, or an empty result when nothing is " +
            "found. One contact and one contact type per call. To find " +
            "the people or companies first use Lev8 Entity Search.",
        docsUrl: "https://docs.lev8.com/api-reference/contact-search/search",
        categories: ["people-enrichment"],
        notes: [
            "Charged only when a contact is found: 10 credits for an " +
            "email, 30 for a phone number. Not found (`result.content` " +
            "null, empty or whitespace) costs nothing.",
        ],
    },
    request: { method: "POST", path: "/v1/contact-search" },
    input: { schema: { body: zLev8ContactSearchBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                email_found: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "emails found",
                    consumes: { credit: "default", amount: 10 },
                },
                phone_found: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "phone numbers found",
                    consumes: { credit: "default", amount: 30 },
                },
            },
        },
        /** The hold promises a hit on the requested line. */
        estimate: ({ data }) => ({
            counts: { [data.input.body.contact_type + "_found"]: 1 },
        }),
        evidence: ({ data, utils }) => {
            const content = utils.json.optionalGet(
                data.output,
                "$.result.content",
            );
            const found = typeof content === "string" &&
                content.trim() !== "";
            return {
                counts: {
                    [data.input.body.contact_type + "_found"]: found ? 1 : 0,
                },
            };
        },
    },
});
