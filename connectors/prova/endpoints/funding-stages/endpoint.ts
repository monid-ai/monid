import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFundingStagesBody } from "./schema/inputs.ts";

/** POST /funding-stages — one company's funding rounds. */
export default defineEndpoint({
    meta: {
        displayName: "Get Company Funding Rounds",
        summary: "Get a company's funding rounds from its website, name, " +
            "or LinkedIn slug.",
        description: "Look up one company by website domain, name, or " +
            "LinkedIn slug (exactly one) and get its funding history. " +
            "Answers `found` with the company (name, domain, public " +
            "listing if any), `latest_round` (the newest dated equity " +
            "round; loans and grants never count), and `rounds`, newest " +
            "first — each with stage (e.g. seed, series_a), amount, " +
            "currency, date, investors, lead_investors, and source " +
            "(`confirmed`: checked against a public announcement; " +
            "`database`: from a funding database, not checked). Answers " +
            "`not_found` with a message when no funding is found, and " +
            "with `candidates` when a name fits several companies. A " +
            "company Prova has not researched is looked up live, usually " +
            'in about 5 seconds. Set `view: "full"` to get each round\'s ' +
            "sources with links and exact quotes. Suited for account " +
            "research, CRM enrichment, and filtering leads by stage or " +
            "recent raises.",
        docsUrl: "https://docs.provaapi.com/reference",
        categories: ["funding-data", "company-enrichment"],
        notes: [
            "Charged only when the answer is `found` ($0.01) — " +
            "`not_found`, `pending`, and errors are free.",
            "A domain gives the most reliable match; a name that fits " +
            "several companies answers `not_found` with `candidates`.",
        ],
    },
    request: { method: "POST", path: "/funding-stages" },
    input: { schema: { body: zFundingStagesBody } },
    /**
     * WHY THIS ENDPOINT OWNS ITS LIFECYCLE: Prova waits up to ~5s for a
     * live lookup of a company it has not seen, then answers 202
     * `{status: "pending"}` — "send the same request again in a few
     * seconds". The declarative path would settle that 202 as the answer.
     * There is no job id to follow on the standard answer: the poll is
     * the same POST, and the per-tick `utils.request()` carries the
     * caller's body, so no state is kept. Re-posts are free; only the
     * final `found` is billed.
     */
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status === 202) return { kind: "RUNNING" };
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
        poll: async ({ utils }) => {
            const res = await utils.request();
            // a 5xx mid-lookup is upstream infrastructure, not an
            // answer — keep polling; `runMs` bounds the wait
            if (res.status === 202 || res.status >= 500) {
                return { kind: "RUNNING" };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        /** $0.01 per lookup answered `found` (provaapi.com pricing). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "found answers",
            description: "lookups answered `found`",
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const status = utils.json.optionalGet(data.output, "$.status");
            return { counts: { RESULT: status === "found" ? 1 : 0 } };
        },
    },
});
