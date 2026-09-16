import { defineProvider, presets } from "@shared/core";

/**
 * People Data Labs (peopledatalabs.com) — person and company enrichment
 * and search. Four synchronous endpoints against
 * `https://api.peopledatalabs.com/v5`, auth `X-Api-Key`.
 *
 * v1 rode the `peopledatalabs` SDK as its transport; here the docs speak
 * the SDK's OWN wire form (read off SDK 14.1.1): enrichment is a GET with
 * every parameter in the query string, search is a POST with a JSON body.
 * The SDK's `rateLimit` block was a client-side artifact assembled from
 * response headers — the raw REST body never carries it, so nothing is
 * stripped.
 *
 * PDL reports its meter ONLY in response headers (`x-call-credits-spent`,
 * `x-totallimit-remaining`), which hook fns cannot read — so there is no
 * `usage.consolidate` (no claim, nothing to strip; the derived fold
 * settles). ONE credit pool: one API key serves person and company calls
 * and v1's balance probe reads a single `x-totallimit-remaining` number
 * for the account (monid-services provider-balance, MONID-185). Open
 * item: whether a company record spends a full credit (v1 unit prices
 * $0.265 vs $0.10 per record suggest it may spend less) — only the
 * `x-call-credits-spent` header can say; re-pin when a key exists.
 *
 * `usage.evidence` is the generic quantities default: a search doc counts
 * `data[]` (PDL: "each record in the data array counts as a single
 * credit"); an enrichment doc is flat (one match = one credit) and counts
 * nothing. v1 lineage: extractResultCount.
 */
export default defineProvider({
    name: "pdl",
    meta: {
        displayName: "People Data Labs",
        summary: "Person and company enrichment and search over billions " +
            "of profiles.",
        description: "Person and company enrichment — resolve identities, " +
            "work history, and firmographics from email, social handles, " +
            "or company domains; plus Elasticsearch or SQL search over the " +
            "full person and company datasets.",
        homepageUrl: "https://www.peopledatalabs.com",
        docsUrl: "https://docs.peopledatalabs.com",
        categories: ["people-enrichment", "company-enrichment"],
    },
    auth: { inject: presets.auth.header("X-Api-Key") },
    request: { baseUrl: "https://api.peopledatalabs.com" },
    // mirrors services/workflows/endpointExecution/config.yml (pdl):
    // request 60s, run 60s — sync provider, no poll loop
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** THE credit system (design D26) — PDL's own meter, one pool for
         *  the whole account (single key, single balance header). */
        credits: { default: { label: "PDL credits" } },
        /** The generic QUANTITIES default (design D27): a PER_UNIT (search)
         *  doc counts the records in `data[]`; flat enrichment docs have
         *  nothing to count. A 200 search with no matches carries an
         *  empty array — 0 records, 0 credits. */
        evidence: ({ data, utils }) => {
            if (data.usage.model.kind !== "PER_UNIT") return { counts: {} };
            const records = utils.json.optionalLen(data.output, "$.data") ??
                0;
            return { counts: { [data.usage.model.unit]: records } };
        },
    },
});
