import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zResearchBuildingOwnersBody } from "./schema/inputs.ts";

// Attaching resolved owners to a workspace Project (`project_id`, `project_name`)
// mutates shared workspace state under a broker credential, so both selectors
// are omitted at the binding.
const zStatelessBuildingOwnersBody = zResearchBuildingOwnersBody.omit({
    project_id: true,
    project_name: true,
});

/** POST /api/v1/buildings/owners: quote ($0.00) or resolve ($0.05/owner) NYC building principals. */
export default defineEndpoint({
    meta: {
        displayName: "Dealport Research Building Owners",
        summary:
            "Quote ($0.00) or resolve ($0.05 per owner) human principals behind 1 to 50 NYC buildings.",
        description:
            "Resolve the distinct human principals and direct contact details " +
            "behind LLC and LP deed/mortgage entities across 1 to 50 NYC " +
            "buildings (`bbls`). Omit `confirm_max_usd` first for a free " +
            "($0.00) quote returning `distinct_owners` and `total_usd`; pass " +
            "`confirm_max_usd` at or above `total_usd` to run owner " +
            "resolution at $0.05 per distinct human owner.",
        docsUrl: "https://dealport.com/docs",
        categories: ["real-estate", "people-enrichment"],
        notes: [
            "Requires the `watch` API key scope.",
            "Call without `confirm_max_usd` first to inspect the $0.00 quote; " +
            "if `confirm_max_usd` is below `total_usd`, Dealport answers 409 " +
            "`requote` with zero charge.",
        ],
    },
    request: { method: "POST", path: "/api/v1/buildings/owners" },
    input: { schema: { body: zStatelessBuildingOwnersBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "building owners",
            description:
                "distinct human NYC building owners resolved ($0.00 for an unconfirmed quote)",
            consumes: { credit: "default", amount: 0.05 },
        },
        estimate: ({ data }) => {
            const capUsd = data.input.body.confirm_max_usd;
            if (capUsd === undefined) return { counts: { RESULT: 0 } };
            const bbls = data.input.body.bbls;
            const uniqueBbls = bbls.filter(
                (bbl, index) => bbls.indexOf(bbl) === index,
            ).length;
            const maxByCap = Math.floor((capUsd + 1e-9) / 0.05);
            return { counts: { RESULT: Math.min(uniqueBbls, maxByCap) } };
        },
        evidence: ({ data, utils }) => {
            const quotedOnly = utils.json.optionalGet(
                data.output,
                "$.data.quoted_only",
            );
            const costUsd = utils.json.optionalNum(data.output, "$.cost_usd") ??
                utils.json.optionalNum(data.output, "$.data.cost_usd");
            const cents = utils.json.optionalNum(
                data.output,
                "$.credits_charged",
            ) ?? utils.json.optionalNum(data.output, "$.data.credits_charged");
            if (quotedOnly === true || costUsd === 0 || cents === 0) {
                return { counts: { RESULT: 0 } };
            }
            return {
                counts: {
                    RESULT: utils.json.optionalNum(
                        data.output,
                        "$.data.distinct_owners",
                    ) ?? 0,
                },
            };
        },
    },
});
