import { defineProvider, presets } from "@shared/core";

/**
 * outbound.dev — B2B leads for agents: people and company search, the
 * decision makers at one company, free counts, filter vocabularies,
 * suggestions and a company resolver, then work emails, phone numbers and
 * email verification. JSON over HTTPS against `https://api.outbound.dev/v1`,
 * one `ob_live_` key sent as `Authorization: Bearer`.
 *
 * TWO SHAPES live behind the one host:
 *
 *   - SYNC — the three searches, the filter values, the suggestions, the
 *     company resolver, the email and phone lookups and email verification.
 *     One request, one answer.
 *   - ASYNC — the two counts and the bulk enrichment. A new count answers
 *     `202 pending` with the filters it is counting, and the same request
 *     with those filters answers `200 ready` once counted. The bulk
 *     enrichment answers `202` with a job, read back from
 *     `GET /v1/jobs/{jobId}` until it ends. That read is not a catalog
 *     endpoint: the engine drives every poll inside the run.
 *
 * THE LIFECYCLE IS NOT ON THE PROVIDER. A provider-level `start` replaces
 * declarative execution on the sync endpoints too, so each async endpoint
 * authors its own phases.
 *
 * BILLING — THE POOL IS DOLLARS. outbound.dev bills a prepaid balance in US
 * dollars and publishes every price in dollars (`GET /v1/prices`,
 * docs.outbound.dev/billing, price list 2026-11-26), so each billed
 * endpoint pins its own lines (the exa / apify posture):
 *
 *   - the three searches: $0.001 per record returned. An empty page, or a
 *     company nothing matches, is free.
 *   - a work email: $0.02 when outbound.dev's own data package finds it,
 *     $0.05 when a further provider does. A miss is free.
 *   - a phone number: $0.05 from the package, $0.10 from a further
 *     provider. A miss is free.
 *   - an email verification: $0.01 per verdict; `unknown` is free.
 *   - counts, filter values, suggestions and the resolver are `FREE`.
 *
 * outbound.dev also states each call's charge in the `X-Charged-Usd`
 * response header. The settle envelope carries no headers, and reading one
 * takes a lifecycle on every endpoint (cloro's posture), so the sync
 * endpoints derive their quantities from the body instead: the rows on the
 * page, the values under `found`, the verdict. The bulk job's body does
 * carry its charge (`chargedUsd`), and that endpoint claims it.
 *
 * ERRORS: a refusal carries `{error: {code, message, param?, doc_url,
 * request_id}}`; a `429` (with `Retry-After`) and a `5xx` answer an empty
 * object. Nothing is charged on any of them. `output.fromError`
 * digests the envelope; vendor non-2xx is DATA, zero usage.
 *
 * SURFACES NOT IN THIS CONNECTOR, and why:
 *   - Saved searches, lists, folders, campaigns, sending accounts,
 *     conversations and knowledge hubs: they read and write the
 *     outbound.dev workspace that holds the key, one workspace shared by
 *     every caller on a broker. For the same reason the searches do not
 *     take `savedSearchId` or `savedSearchName`, and the lookups do not
 *     take `personId`.
 *   - The account reads (`/me`, `/wallet`, `/usage`, `/limits`,
 *     `/requests`, `/prices`): they describe the platform's own key.
 *   - `POST /companies/search/save` and `POST /lists/{listId}/enrich`:
 *     both write to a list in that workspace.
 */
export default defineProvider({
    name: "outbound-dev",
    meta: {
        displayName: "outbound.dev",
        summary:
            "B2B leads for agents: people and company search, decision makers at a company, work emails, phone numbers and email verification.",
        description: "B2B leads for agents. Find people and companies from " +
            "filters or a plain-English description, list the decision " +
            "makers at any company with full names, titles and LinkedIn " +
            "URLs, then find their work emails and phone numbers and verify " +
            "emails before sending. Search is billed per record returned, " +
            "emails and phone numbers only when found, and a verification " +
            "only when it gives a verdict. Counts, filter values, " +
            "suggestions and company lookups are free.",
        homepageUrl: "https://outbound.dev",
        docsUrl: "https://docs.outbound.dev",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "A refusal is charged nothing: it carries `code` and `message` " +
            "(and `param` naming the offending field when there is one).",
            "`429` answers an empty object with `Retry-After` in seconds: " +
            "repeat the call after it. A `5xx` answers an empty object and " +
            "charged nothing.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.outbound.dev/v1" },
    /** outbound.dev waits up to two minutes on its own data provider
     *  before it answers, and a call the caller gave up on is still charged
     *  when it lands, so a request gets a little over that. The async
     *  endpoints set their own budgets. */
    timeouts: { requestMs: 125_000, runMs: 130_000 },
    usage: {
        /** THE credit system (design D26): outbound.dev bills a prepaid
         *  dollar balance and publishes every price in dollars, so the pool
         *  IS dollars. Each billed endpoint pins its own lines. */
        credits: { default: { label: "US dollars" } },
    },
    output: {
        /** outbound.dev's error envelope is `{error: {code, message,
         *  param?, doc_url, request_id}}`. The machine `code` is what an
         *  agent branches on (`insufficient_balance`, `validation_failed`,
         *  `person_not_identifiable`), and `param` names the field to fix.
         *  A `429` and a `5xx` answer `{}` and carry neither. */
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
                    : "outbound.dev API error",
                ...(typeof code === "string" ? { code } : {}),
                ...(typeof param === "string" ? { param } : {}),
                raw: data.output,
            };
        },
    },
});
