import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFindContactBody } from "./schema/inputs.ts";

/** POST /api/v1/contacts: find verified principal phones, emails, and profile ($0.09/hit). */
export default defineEndpoint({
    meta: {
        displayName: "Dealport Find Contact",
        summary:
            "Find verified phones, emails, and career profile for a company owner or named principal ($0.09 per hit; $0.00 miss).",
        description:
            "Find verified direct mobile and direct phone numbers, work and " +
            "personal emails, and professional profile details for a company " +
            "owner or a specific named principal (`person`) on a Dealport " +
            "company Record. Charges $0.09 per verified contact hit; settles " +
            "at $0.00 when no verified phone or email is found or on 30-day " +
            "workspace repeat.",
        docsUrl: "https://dealport.com/docs",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "Requires the `owners` API key scope.",
            "Pass `person` to target a specific principal listed on the " +
            "company Record; omit `person` to target the primary human owner.",
        ],
    },
    request: { method: "POST", path: "/api/v1/contacts" },
    input: { schema: { body: zFindContactBody } },
    timeouts: { requestMs: 150_000, runMs: 160_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "verified contact hits",
            description:
                "verified principal contact hits ($0.00 when not found or on 30-day workspace repeat)",
            consumes: { credit: "default", amount: 0.09 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const costUsd = utils.json.optionalNum(data.output, "$.cost_usd");
            const cents = utils.json.optionalNum(
                data.output,
                "$.credits_charged",
            );
            if (costUsd === 0 || cents === 0) {
                return { counts: { RESULT: 0 } };
            }
            const phone = utils.json.optionalGet(data.output, "$.phone");
            const email = utils.json.optionalGet(data.output, "$.email");
            const hit = (typeof phone === "string" && phone.length > 0) ||
                (typeof email === "string" && email.length > 0);
            return { counts: { RESULT: hit ? 1 : 0 } };
        },
    },
});
