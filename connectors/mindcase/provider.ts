import { defineProvider, presets } from "@shared/core";

/**
 * Mindcase - structured web data APIs (social, people and company
 * enrichment, e-commerce, Indian quick commerce, jobs, reviews, finance,
 * real estate, Indian company registries) behind one async job API.
 *
 * PRICING SOURCE: every rate in the endpoint models is generated from the
 * live public schema, GET https://api.mindcase.co/v1/data/{group}/{slug}
 * (`price_per_record`, `input_modes[].price_per_page`, `page_fee`,
 * `addons`), retrieved 2026-11-17, and cross-checked against settled
 * production jobs. Docs: https://docs.mindcase.co/pricing
 *
 *   - start: POST /v1/data/{group}/{slug}/run with `{params}` (the caller's
 *     body, wrapped by the provider toRequest) → `{job_id, status}`. API
 *     errors (401 bad key, 402 empty wallet, 422 unknown parameter) are DATA.
 *   - poll: GET /v1/jobs/{id} until the status is terminal; on `completed`
 *     read every row from GET /v1/jobs/{id}/results (one response, no
 *     paging). `failed` / `cancelled` / `rejected_balance` synthesize
 *     500 / 409 / 402 error-as-data, which the engine zero-bills.
 *   - stop: best-effort DELETE /v1/jobs/{id}.
 *
 * BILLING: Mindcase bills per returned row from a prepaid USD wallet, and
 * every job record carries the vendor's own total as `usd_used`. That is
 * the claim (usage.consolidate); each endpoint's model × row counts is the
 * cross-check. Zero-row jobs bill $0.
 */
export default defineProvider({
    name: "mindcase",
    meta: {
        displayName: "Mindcase",
        summary:
            "Structured web data across 110 platforms: social, people and company enrichment, e-commerce and Indian quick commerce, jobs, reviews, finance, crypto, real estate and web scraping, priced per row.",
        description:
            "Mindcase runs hosted data agents that return clean, structured" +
            " rows. Social: LinkedIn (profiles, people search, company " +
            "employees, companies, posts, comments, reactions, jobs, ads), " +
            "Instagram, TikTok, X, Facebook, YouTube, Reddit, Threads, " +
            "Telegram, Pinterest, Bluesky, Twitch, Snapchat, Discord and " +
            "Chinese platforms (Douyin, Weibo, Bilibili, Kuaishou, WeChat, " +
            "Xigua, Toutiao). People and companies: person enrichment, " +
            "professional and personal emails, phone lookup, email " +
            "verification, company enrichment, domain lookup, tech stack " +
            "and companies by technology. Commerce: Amazon, Walmart, " +
            "Target, eBay (live and sold), Etsy, AliExpress, Shopee, " +
            "Lazada, Mercado Libre, Best Buy, Home Depot, IKEA, Shopify " +
            "stores, TikTok Shop, StockX, GOAT and Farfetch, plus Indian " +
            "quick commerce (Blinkit, Zepto, Swiggy Instamart, BigBasket, " +
            "Flipkart Minutes, Amazon Now) with store-level prices, MRP, " +
            "stock and search rank. Jobs: LinkedIn, Indeed, Glassdoor, " +
            "Greenhouse, Wellfound, Naukri, Internshala, Upwork and H-1B " +
            "salaries. Reviews: Google Maps, Yelp, Tripadvisor, Trustpilot," +
            " G2, Capterra, Gartner, App Store and Google Play. Finance: " +
            "SEC filings, financials, insider trades and ownership, Yahoo " +
            "Finance, Finviz, congressional trades, US Treasury rates, " +
            "Indian IPOs, crypto wallets, token holders and ETF flows, " +
            "Polymarket. India company data: MCA company master, directors " +
            "and multi-year financials, GST taxpayer records and EPFO " +
            "establishments. Also Google Search, News, Images, Videos, " +
            "Trends and Patents, AI assistant answers and brand mentions, " +
            "Similarweb, Ahrefs, web scrape, crawl and extract, customs " +
            "shipments, Zillow, Redfin and Realtor listings, and Y " +
            "Combinator companies and founders. Each call starts one job, " +
            "waits for it and returns every row with stable camelCase field" +
            " names. Billed per row returned; a few search agents add a " +
            "small flat search fee, stated on the endpoint.",
        homepageUrl: "https://mindcase.co",
        docsUrl: "https://docs.mindcase.co",
        notes: [
            "Runs are asynchronous: typical completion is 10-60 s, large searches can take several minutes.",
            "Billing is per returned row; a run that finds nothing settles at zero unless the endpoint states a flat search fee.",
            "Send only the documented input keys; the API rejects unknown keys with 422.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://api.mindcase.co",
        headers: { Accept: "application/json" },
    },
    input: {
        /** The API takes the agent's inputs under `params`; callers send
         *  them flat, so one shared fn wraps them for every endpoint. */
        toRequest: ({ data }) => ({
            ...data.input,
            body: { params: data.input.body ?? {} },
        }),
    },
    timeouts: { requestMs: 60_000, runMs: 900_000, pollMs: 3_000 },
    lifecycle: {
        start: async ({ data, utils }) => {
            // A retried start replays the original job instead of starting
            // (and charging) a second one: the key is stable per run.
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":start",
                },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const jobId = utils.json.optionalGet(res.body, "$.job_id");
            if (typeof jobId !== "string" || jobId === "") {
                throw Object.assign(
                    new Error("Mindcase run returned no job_id"),
                    { retriable: false },
                );
            }
            return { kind: "RUNNING", state: { externalRunId: jobId } };
        },
        poll: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) {
                throw Object.assign(
                    new Error("mindcase poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const job = await utils.http({
                method: "GET",
                path: "/v1/jobs/" + encodeURIComponent(jobId),
            });
            if (job.status < 200 || job.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: job.status,
                    output: job.body,
                };
            }
            const status = utils.json.optionalGet(job.body, "$.status");
            if (status === "queued" || status === "running") {
                return {
                    kind: "RUNNING",
                    state: { externalRunId: jobId, stage: status },
                };
            }
            if (
                status === "failed" || status === "cancelled" ||
                status === "rejected_balance"
            ) {
                const error = utils.json.optionalGet(job.body, "$.error");
                logger.warn("mindcase job did not complete", {
                    jobId,
                    status,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: status === "rejected_balance"
                        ? 402
                        : status === "cancelled"
                        ? 409
                        : 500,
                    providerHttpStatus: job.status,
                    output: {
                        message: typeof error === "string" && error !== ""
                            ? error
                            : "Mindcase job ended with status " + status,
                        status,
                        job_id: jobId,
                        // recovery fields the API documents on failed jobs
                        error_code:
                            utils.json.optionalGet(job.body, "$.error_code") ??
                                null,
                        retryable:
                            utils.json.optionalGet(job.body, "$.retryable") ??
                                null,
                        fault: utils.json.optionalGet(job.body, "$.fault") ??
                            null,
                        stop_reason:
                            utils.json.optionalGet(job.body, "$.stop_reason") ??
                                null,
                    },
                };
            }
            if (status !== "completed") {
                logger.warn(
                    "mindcase job status unrecognized, treating as in flight",
                    { jobId, status: String(status) },
                );
                return { kind: "RUNNING" };
            }
            const results = await utils.http({
                method: "GET",
                path: "/v1/jobs/" + encodeURIComponent(jobId) + "/results",
            });
            if (results.status < 200 || results.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: results.status,
                    output: results.body,
                };
            }
            const rows = utils.json.optionalGet(results.body, "$.data");
            const notice = utils.json.optionalGet(results.body, "$.notice");
            const usdUsed = utils.json.optionalNum(job.body, "$.usd_used");
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: results.status,
                output: utils.json.merge({
                    job_id: jobId,
                    row_count: Array.isArray(rows) ? rows.length : 0,
                    data: Array.isArray(rows) ? rows : [],
                }, {
                    ...(typeof notice === "string" ? { notice } : {}),
                    ...(usdUsed !== undefined ? { usd_used: usdUsed } : {}),
                }),
            };
        },
        stop: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) {
                throw Object.assign(
                    new Error("mindcase stop without externalRunId in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "DELETE",
                path: "/v1/jobs/" + encodeURIComponent(jobId),
            });
            if (res.status < 200 || res.status >= 300) {
                logger.warn("mindcase cancel failed (best-effort, ignored)", {
                    jobId,
                    status: res.status,
                });
            }
        },
    },
    output: {
        /** Digest both error shapes: the API's FastAPI-style `{detail}`
         *  (string or validation list) and lifecycle-synthesized
         *  `{message}`. The raw body rides along under `raw`. */
        fromError: ({ data, utils }) => {
            const detail = utils.json.optionalGet(data.output, "$.detail");
            const flat = utils.json.optionalGet(data.output, "$.message");
            const message = typeof detail === "string"
                ? detail
                : typeof flat === "string"
                ? flat
                : Array.isArray(detail)
                ? "Invalid input: " + JSON.stringify(detail)
                : "Mindcase API error";
            return { message, raw: data.output };
        },
    },
    usage: {
        /** Mindcase meters in US dollars from a prepaid wallet: one pool. */
        credits: { default: { label: "US dollars" } },
        /** The vendor's own claim: the job record's `usd_used`, lifted out
         *  of the payload (OMITTED when absent, never `?? 0`). */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.usd_used",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
        /** Rows delivered, keyed by the doc's sole metered line. Endpoints
         *  with a second metered line (pages, images) own their fns. */
        evidence: ({ data, utils }) => {
            let key;
            switch (data.usage.model.kind) {
                case "PER_UNIT":
                    key = data.usage.model.unit;
                    break;
                case "COMPOSITE":
                    key = Object.entries(data.usage.model.components)
                        .find(([, component]) => component.kind === "PER_UNIT")
                        ?.[0];
                    break;
                case "PER_CALL":
                case "FREE":
                    key = undefined;
                    break;
            }
            if (key === undefined) return { counts: {} };
            const rows = utils.json.optionalLen(data.output, "$.data") ?? 0;
            return { counts: { [key]: rows } };
        },
    },
});
