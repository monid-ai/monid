import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFindOwnerBody } from "./schema/inputs.ts";

/** POST /api/v1/owners: resolve verified human company owner and contacts ($0.09/hit). */
export default defineEndpoint({
    meta: {
        displayName: "Dealport Find Owner",
        summary:
            "Resolve the verified human company owner, direct phones, emails, and career profile ($0.09 per hit; $0.00 miss).",
        description:
            "Resolve the human principal behind a US private company " +
            "(filtering out corporate registered agents, law firms, and " +
            "accounting firms), verify direct mobile phones, direct lines, " +
            "and work or personal emails (excluding switchboards and shared " +
            "role mailboxes), and return their professional profile " +
            "(LinkedIn URL, headline, summary, career roles, education, " +
            "skills, and certifications). Charges $0.09 strictly when a " +
            "verified non-suppressed phone or email is returned; $0.00 when " +
            "not found or on 30-day workspace repeat.",
        docsUrl: "https://dealport.com/docs",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "Requires the `owners` API key scope.",
            "Settles at $0.00 when no verified phone or email is found or " +
            "when the same company owner was already resolved in the " +
            "workspace within 30 days.",
        ],
    },
    request: { method: "POST", path: "/api/v1/owners" },
    input: { schema: { body: zFindOwnerBody } },
    timeouts: { requestMs: 150_000, runMs: 160_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "verified owner hits",
            description:
                "verified human owner contact hits ($0.00 when not found or on 30-day workspace repeat)",
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
