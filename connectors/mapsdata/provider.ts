import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * MapsData (mapsdata.ai) — Google Maps business leads with verified emails.
 * JSON-over-HTTP against `https://mapsdata.ai/api/v1` with
 * `Authorization: Bearer <key>`. The key needs the `scrape:read` and
 * `scrape:write` scopes.
 *
 * One endpoint runs as a durable job (`/jobs`, a scrape that takes minutes
 * to hours) and three answer synchronously (`/categories`,
 * `/categories/validate`, `/regions`): the free lookups an agent needs to
 * build a submission the vendor will accept. The job lifecycle is authored on
 * `/jobs` itself, because a provider-level `start` would be inherited by the
 * three lookups and replace their declarative execution.
 *
 * DELIBERATELY NOT EXPOSED: `GET /jobs`, `GET /jobs/{id}`,
 * `GET /jobs/{id}/download` and `POST /jobs/{id}/cancel`. On the hosted
 * platform every caller shares ONE MapsData workspace, so a by-id reader
 * would let one caller read or cancel another caller's scrape and the list
 * would enumerate all of them. The `/jobs` run returns everything a caller
 * paid for (the job record plus the leads), so nothing is lost.
 *
 * BILLING is in MapsData's own unit: one lead = one delivered row carrying a
 * deliverable email, the same figure the vendor bills its own subscribers
 * on. The pool is that unit rather than dollars because MapsData sells it
 * through plans, not a public per-call price; the conversion stays the
 * broker card's job. The three lookups are FREE.
 */
export default defineProvider({
    name: "mapsdata",
    meta: {
        displayName: "MapsData",
        summary: "Google Maps business leads with verified emails, by " +
            "category and location.",
        description: "MapsData scrapes Google Maps for every business in a " +
            "category across whole regions or named cities in the US, " +
            "Canada, the UK and Australia, then visits each business's " +
            "website to find contact emails and verifies them. Each lead " +
            "carries the business name, phone, address, website, domain, " +
            "rating, review count, categories, opening hours, Google Maps " +
            "URL and a verified email. Built for outbound lead lists: a " +
            "single job can cover a whole state, deduplicated by business. " +
            "Categories must be canonical Google Maps categories, so resolve " +
            "free-text terms with mapsdata#categories/validate first.",
        homepageUrl: "https://mapsdata.ai",
        docsUrl: "https://mapsdata.ai/api/v1/openapi.json",
        categories: ["maps"],
        notes: [
            "Every non-2xx answers `{error: {code, message, field, details, " +
            "request_id}}`; `error.code` is a stable machine string (for " +
            "example `unsupported_query` or `unknown_regions`) and " +
            "`details` carries suggestions where the vendor has them.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://mapsdata.ai/api/v1" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26): MapsData's billable unit is a
         *  lead with a deliverable email. One pool, `default`. */
        credits: { default: { label: "MapsData leads" } },
        /** The lookups are free; `/jobs` overrides with its per-lead model. */
        model: { kind: UsageModelKind.FREE },
    },
    output: {
        /** MapsData's error envelope is `{error: {code, message, field?,
         *  details, request_id?}}` on every 4xx and 5xx. The `/jobs`
         *  lifecycle shapes its synthesized failures the same way, so this
         *  one mapper serves both. Vendor non-2xx is DATA — zero usage. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            const field = utils.json.optionalGet(data.output, "$.error.field");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "MapsData API error",
                ...(typeof code === "string" ? { code } : {}),
                ...(typeof field === "string" ? { field } : {}),
                raw: data.output,
            };
        },
    },
});
