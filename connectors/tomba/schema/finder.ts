import { Unit, type UsageEvidenceFn, UsageModelKind } from "@shared/core";

/**
 * The finder-family rate card (design D6), shared by the three endpoints
 * that publish "1 search credit, or 6 with phone data": email-finder,
 * enrich, and linkedin.
 */
export const finderModel = {
    kind: UsageModelKind.COMPOSITE,
    components: {
        lookup: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "addresses found",
            description: "addresses returned (a miss counts zero)",
            consumes: { credit: "search", amount: 1 },
        },
        phones: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "phone add-ons",
            description: "results carrying phone data (enrich_mobile=true)",
            consumes: { credit: "search", amount: 5 },
        },
    },
} as const;

/**
 * The single-address finders' hooks — email-finder and enrich read the
 * same response (`EmailFinder.yaml`) and publish the same charging rule, so
 * they share ONE estimate and ONE evidence fn (one fnTable entry each).
 * linkedin keeps its own: `full=true` answers an array. Both fns are
 * closed terms — no captures, everything through `data` / `utils`.
 */

/** 1 lookup, plus the phone add-on when enrich_mobile is set. */
export const singleFinderEstimate = ({ data }: {
    data: { input: { queryParams: { enrich_mobile?: boolean } } };
}) => ({
    counts: {
        lookup: 1,
        phones: data.input.queryParams.enrich_mobile === true ? 1 : 0,
    },
});

/** Found = `data.email` non-empty AND `verification.status` not
 *  `unknown`; the phone add-on when that result carries `phone_data`
 *  (absent, `[]`, or `null` upstream — never trusted to be an array). */
export const singleFinderEvidence = (
    { data, utils }: Parameters<UsageEvidenceFn>[0],
) => {
    const email = utils.json.optionalGet(data.output, "$.data.email");
    const status = utils.json.optionalGet(
        data.output,
        "$.data.verification.status",
    );
    const found = typeof email === "string" && email !== "" &&
        status !== "unknown";
    const phoneData = utils.json.optionalGet(data.output, "$.data.phone_data");
    const phones = Array.isArray(phoneData) ? phoneData.length : 0;
    return {
        counts: {
            lookup: found ? 1 : 0,
            phones: found && phones > 0 ? 1 : 0,
        },
    };
};
