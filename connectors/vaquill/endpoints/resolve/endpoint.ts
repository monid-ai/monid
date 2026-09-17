import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zStatuteResolveBody } from "./schema/inputs.ts";

/**
 * `POST /us/statutes/resolve`: turn Bluebook citations into sections.
 *
 * Billed PER CITATION SUBMITTED, and note that this is the one endpoint
 * here where a miss still bills: verified live 2026-09-17, one resolvable
 * and one nonsense citation billed 4, with `resolvedCount: 1`. The work is
 * the lookup, not the hit, so the count that settles is the de-duplicated
 * INPUT length, `$.results`, and never `resolvedCount`.
 *
 * Vaquill also publishes a single-citation `GET` at this same path. It is
 * not ported: the batch form takes one citation just as happily, at the
 * same per-citation price, and two endpoints cannot share one identity.
 */
export default defineEndpoint({
    meta: {
        displayName: "Resolve US Citations",
        summary: "Resolve Bluebook citations to the sections they name.",
        description: "Resolve one or more Bluebook citations to the " +
            "sections they name, returning each section's `actId` and " +
            "metadata plus the pinpointed subsection where the citation " +
            "carries one. Handles federal and state forms: `42 U.S.C. " +
            "1983`, `16 C.F.R. 444.1`, `Tex. Penal Code 22.01`. Pass " +
            "`state` or `corpusType` to settle a form that is ambiguous " +
            "across jurisdictions. This is how a citation lifted out of a " +
            "brief, a contract or a model's output becomes something you " +
            "can fetch the text of and check the status of.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/resolve-many-citations-at-once",
        categories: ["legal-research"],
        notes: [
            "A citation that resolves to nothing is still billed: the " +
            "lookup ran. `resolved: false` on a result row reports the " +
            "miss.",
            "The cap is 50 UNIQUE citations, applied AFTER duplicates are " +
            "collapsed, so sixty repeats of one citation is one citation " +
            "and is accepted. The schema bounds the raw list at 500; the " +
            "post-collapse cap is the vendor's own 422.",
        ],
    },
    request: { method: "POST", path: "/us/statutes/resolve" },
    input: { schema: { body: zStatuteResolveBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 2 },
            label: "citations",
        },
        /** DISTINCT citations. The vendor collapses duplicates BEFORE it
         *  prices the batch, so counting the raw list would promise 120
         *  credits for sixty copies of one citation that bill 2 (verified
         *  live). `Set` is not a whitelisted closed-term global, so the
         *  distinct count is an indexOf filter over the array itself. */
        estimate: ({ data }) => {
            const cites = data.input.body.citations;
            return {
                counts: {
                    RESULT: cites.filter((cite, at) =>
                        cites.indexOf(cite) === at
                    ).length,
                },
            };
        },
        /** `results` IS the de-duplicated input, one row per citation
         *  whether or not it resolved, which is the billable count. `resolvedCount`
         *  is the hit rate and would under-bill. */
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.optionalLen(data.output, "$.results") ?? 0,
            },
        }),
    },
});
