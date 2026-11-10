import { defineProvider } from "@shared/core";

/**
 * Fuse (fuseai.com) — B2B people and company data for prospecting: search,
 * counts, filter vocabularies, a company resolver, a company's people, and
 * email / phone lookups both ways with email verification. JSON over HTTPS
 * against `https://api.tryfuse.ai/api/v1/business`, one `af_` API key.
 *
 * AUTH: the key is sent RAW, `Authorization: Basic af_…`, which is the form
 * Fuse's docs show. Fuse also takes RFC 7617's base64 of `af_…:`; neither
 * preset produces either, so the inject is spelled inline (the opoint
 * posture for a non-standard Authorization value).
 *
 * TWO SHAPES live behind the one host:
 *
 *   - SYNC — search, filter values, the company resolver, a company's
 *     people, the email and phone lookups and their reverse lookups (who an
 *     address or a number belongs to), and email verification. One request,
 *     one answer.
 *   - ASYNC — the people and company counts and the bulk lookup job. A new
 *     count answers `202 pending` with the filters it is counting, and the
 *     same request with those filters answers `200 ready` once counted. The
 *     bulk job answers `202` with a `jobId` and is read back from
 *     `GET /data/people/enrich-jobs/{jobId}` until it finishes. That read is
 *     not a catalog endpoint: the engine drives every poll inside the run.
 *
 * THE LIFECYCLE IS NOT ON THE PROVIDER. A provider-level `start` replaces
 * declarative execution on the sync endpoints too, so each async endpoint
 * authors its own phases.
 *
 * BILLING — FUSE'S RECEIPT SETTLES THE RUN. Fuse meters in its own credits,
 * and every lookup, verification and job answer carries `creditsCharged`:
 * what Fuse debited for that call, 0 for a miss, an `unknown` verdict or a
 * free endpoint. So every billed endpoint here is metered in Fuse credits:
 *
 *   - the lookups, the reverse lookups, the verification, the bulk job
 *     and a company's people price a leaf `PER_UNIT` in `CREDIT` units, and
 *     the receipt is the EVIDENCE as well as the claim. It has to be: the
 *     engine prunes a zero claim and falls back to the derived fold, and
 *     Fuse's zero receipts are real answers.
 *   - the two searches carry no receipt field. Fuse debits 1 credit per row
 *     returned, so each search counts its rows (`PER_UNIT` in `RESULT`).
 *   - counts, filter values and the resolver are `FREE`.
 *
 * Provider-level `usage.consolidate` plucks the receipt out of every
 * payload, the free endpoints' zero included.
 *
 * RATES appear in one place only, the pre-run `usage.estimate` ceilings,
 * read from the usage plan of the key Fuse issues to the platform
 * (`GET /business/data/pricing`, 2026-10-29): `people_email` 5 per email
 * found, `people_phone` 10 per phone found, `email_verify` 1 per verdict
 * (`unknown` free), the bulk job priced per row by those two, and 1 per row
 * returned by either search; and the entries Fuse sets on that plan for the
 * routes added 2026-11-02: `people_reverse_email` 1 and
 * `people_reverse_phone` 2 per person found, `company_people` 1 per person
 * returned. A rate change on Fuse's side moves the settle with it; only the
 * ceiling is pinned.
 *
 * ERRORS: every non-2xx carries `{error: {code, message, param, values?,
 * doc_url, request_id}}`; every 5xx answers `UNEXPECTED_ERROR`. Fuse
 * charges nothing on any of them. `output.fromError` digests the envelope;
 * vendor non-2xx is DATA, zero usage.
 *
 * SURFACES NOT IN THIS CONNECTOR, and why:
 *   - `GET /data/pricing`: it answers in Fuse credits for the platform's own
 *     key, a price no caller here pays.
 *   - Saved searches, lists, contacts, campaigns, exports and agents: they
 *     read and write the Fuse workspace that holds the key, one workspace
 *     shared by every caller on a broker.
 *   - Autocomplete: held back for now; the filter descriptions name the
 *     vocabularies `fuse#prospects/filter-options` and
 *     `fuse#companies/filter-options` serve.
 */
export default defineProvider({
    name: "fuse",
    meta: {
        displayName: "Fuse",
        summary:
            "B2B people and company search, a company's people, free counts and company resolution, and email and phone lookups both ways.",
        description: "Fuse finds the people and companies a sales or " +
            "recruiting agent is looking for, and the contact details to " +
            'reach them. Describe the search in plain English ("VPs of ' +
            'sales at fintech companies in New York") or with filters on ' +
            "job title, seniority, department, employer, industry, " +
            "location, headcount, revenue, funding stage and technologies. " +
            "Size it first with a free count, list the matching people or " +
            "companies, then find a work email or phone for the ones that " +
            "matter, one at a time or 100 at once, and verify an address " +
            "before sending to it. List the decision makers at one company, " +
            "and turn an email address or a phone number back into the " +
            "person who owns it. Lookups charge only for what they find. " +
            "Free tools list every filter's accepted values and turn a " +
            "company name into its domain, LinkedIn page and logo.",
        homepageUrl: "https://fuseai.com",
        docsUrl: "https://docs.fuseai.com",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "A refusal is charged nothing: every non-2xx answer carries " +
            "`code` and `message` (and `param` naming the offending field " +
            "when there is one).",
            "`429` RATE_LIMITED carries `Retry-After` in seconds; repeat " +
            "the call after it.",
        ],
    },
    auth: {
        /** `Authorization: Basic af_…` — the raw key, as Fuse documents
         *  it. Neither preset speaks it: `header` sends a bare value and
         *  `bearer` prefixes "Bearer ". */
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                Authorization: "Basic " + data.params.apiKey,
            },
        }),
    },
    request: { baseUrl: "https://api.tryfuse.ai/api/v1/business" },
    /** A lookup runs Fuse's provider waterfall inside the request (about
     *  10 to 25 s, then `504`), and a search has about 28 s before it
     *  answers `503` or `504`. The async endpoints set their own budgets. */
    timeouts: { requestMs: 35_000, runMs: 40_000 },
    usage: {
        /** THE credit system (design D26): Fuse meters in its OWN credits.
         *  No dollar rate is pinned here; the conversion is the broker
         *  card's job. */
        credits: {
            default: {
                label: "Fuse credits",
                description:
                    "Fuse credits, debited per value found, per verdict and " +
                    "per row returned",
            },
        },
        /** THE RECEIPT IS THE EVIDENCE for every leaf `PER_UNIT` in
         *  `CREDIT` units: the count is `creditsCharged`, so a zero receipt
         *  settles zero. An absent receipt counts nothing. The searches
         *  override this to count their rows. */
        evidence: ({ data, utils }) => {
            if (data.usage.model.kind !== "PER_UNIT") return { counts: {} };
            const charged = utils.json.optionalNum(
                data.output,
                "$.creditsCharged",
            );
            return {
                counts: charged === undefined
                    ? {}
                    : { [data.usage.model.unit]: charged },
            };
        },
        /** THE VENDOR'S OWN CLAIM (design D27): the same receipt, lifted out
         *  of the payload in one motion. Omitted when absent. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.creditsCharged",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** Fuse's error envelope is `{error: {code, message, param,
         *  values?, doc_url, request_id}}`. The machine `code` is what an
         *  agent branches on (`INSUFFICIENT_CREDITS`, `RATE_LIMITED`,
         *  `PERSON_NOT_IDENTIFIABLE`, `FILTER_VALUE_UNRESOLVED`), and
         *  `param` names the field to fix. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            const param = utils.json.optionalGet(data.output, "$.error.param");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Fuse API error",
                ...(typeof code === "string" ? { code } : {}),
                ...(typeof param === "string" ? { param } : {}),
                raw: data.output,
            };
        },
    },
});
