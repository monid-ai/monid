import { defineProvider, presets } from "@shared/core";

/**
 * Hirebase (hirebase.org) — live job postings and hiring-company data read
 * directly from company careers pages and applicant tracking systems.
 * Every endpoint is JSON over HTTPS against `https://api.hirebase.org`,
 * auth `x-api-key: <key>` (a Bearer header is NOT accepted for API keys).
 *
 * BILLING. Hirebase meters by WHAT A RESPONSE RETURNS, not by route
 * (https://www.hirebase.org/docs/api-reference/billing/usage-headers,
 * checked 2026-11-18): one unit per job record, one per company record,
 * one per insights request, one per salary benchmark. Those are four
 * separate allowances on the account, so they are four pools here. The
 * dollar value of a unit depends on the plan and is the broker card's
 * job, never the doc's.
 *
 * There is no `usage.consolidate`: the meter rides response HEADERS
 * (`Hirebase-Usage-*`), never the body, so there is nothing to lift out of
 * the payload. The derived fold (rows counted by `usage.evidence`) is
 * exact, because the vendor's own rule is "1 per record returned".
 */
export default defineProvider({
    name: "hirebase",
    meta: {
        displayName: "Hirebase",
        summary: "Live job postings and hiring-company data, read " +
            "directly from company careers pages.",
        description: "Structured job postings and hiring-company data for " +
            "agents. Hirebase reads company careers pages and applicant " +
            "tracking systems directly (Greenhouse, Lever, Workday, Ashby " +
            "and many more) rather than job boards, re-checks them around " +
            "the clock, and returns one clean, deduplicated record per " +
            "job: parsed title, salary range, locations, remote policy, " +
            "experience level, skills and technologies, the original " +
            "apply link, and the company behind it. Search jobs by " +
            "filters or by plain-English meaning, find companies that " +
            "are hiring, aggregate salary and demand for any slice of " +
            "the market, and benchmark a role's pay against comparable " +
            "postings.",
        homepageUrl: "https://www.hirebase.org",
        docsUrl: "https://www.hirebase.org/docs",
        categories: ["jobs", "company-enrichment"],
        notes: [
            "Search endpoints bill per record returned, so `limit` is the " +
            "most a call can cost. A search that matches nothing is free.",
            "Failed requests (4xx/5xx) are not billed.",
            "Rate limit: 100 requests per 60 seconds; a 429 carries " +
            "Retry-After.",
            "Jobs come from employers' own careers pages. LinkedIn is used " +
            "only for companies whose careers page cannot be read; such " +
            'jobs carry job_board "linkedin".',
        ],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.hirebase.org/v2" },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** The four allowances a Hirebase account meters. */
        credits: {
            jobs: {
                label: "Hirebase job records",
                description: "one per job record returned",
            },
            companies: {
                label: "Hirebase company records",
                description: "one per company record returned",
            },
            insights: {
                label: "Hirebase insights requests",
                description: "one per insights request",
            },
            salary_benchmarks: {
                label: "Hirebase salary benchmarks",
                description: "one per salary benchmark report",
            },
        },
        /** The generic quantities default: a per-record doc counts the ONE
         *  collection its envelope carries (`jobs` on job searches,
         *  `companies` on company search). Flat docs count nothing. */
        evidence: ({ data, utils }) => {
            if (data.usage.model.kind !== "PER_UNIT") return { counts: {} };
            const rows = utils.json.optionalLen(data.output, "$.jobs") ??
                utils.json.optionalLen(data.output, "$.companies") ?? 0;
            return { counts: { [data.usage.model.unit]: rows } };
        },
    },
    output: {
        /** Hirebase errors are `{detail}` — a sentence on 401/404/429, a
         *  list of field problems on 422. Give the agent one readable
         *  message and keep the raw body beside it. */
        fromError: ({ data, utils }) => {
            const detail = utils.json.optionalGet(data.output, "$.detail");
            return {
                message: typeof detail === "string" && detail !== ""
                    ? detail
                    : Array.isArray(detail)
                    ? "Invalid request: " + JSON.stringify(detail)
                    : "Hirebase API error",
                raw: data.output,
            };
        },
    },
});
