import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { zLev8EntitySearchBody } from "./schema/inputs.ts";

/**
 * Entity Search — ONE monid run drives Lev8's three routes (design D7):
 *
 *   - start: POST /v1/entity-search/create_task with
 *     `Idempotency-Key: {runId}:create_task`. A non-2xx is DATA (422 bad
 *     input, 402 out of credits, 429 task slots full — none reserved
 *     anything); a 2xx without `leads_search_id` is a contract violation.
 *   - poll: GET /v1/entity-search/status until `done` or `error`, then
 *     GET /v1/entity-search/fetch from `pts` 0 until `ready_count` entities
 *     are read (fetch may return fewer than `num`; next `pts` = pts +
 *     count). A status or fetch answering 408/429/5xx THROWS (retriable):
 *     the task is still running — or already billed — upstream, so settling
 *     on a failed lookup would drop paid work. Any other non-2xx (404: the
 *     task expired and Lev8 refunded it) settles as data.
 *   - no stop: Lev8 exposes no cancel. A task runs to its terminal state and
 *     bills even if the run is abandoned.
 *
 * The endpoint id is pinned (`endpoint:`) to `/v1/entity-search`: the
 * create route is plumbing, the catalog surface is the whole search.
 *
 * BILLING (design D8, docs.lev8.com/guides/billing): startup + ready_count ×
 * per-result. Startup is 5 credits, 20 with `enable_web_search`; per result
 * is 10 for the four creator types and 2 for everything else. A terminal
 * `error` REFUNDS the startup but still bills (and serves) its ready
 * results — so an `error` with results settles 200, not as a failure, or
 * the house would pay Lev8 for entities it never billed.
 */
export default defineEndpoint({
    meta: {
        displayName: "Lev8 Entity Search",
        summary:
            "Find companies, people, creators, Shopify stores, Xiaohongshu or WeChat accounts matching an objective.",
        description: "Find up to 500 entities matching a natural-language " +
            "objective, e.g. 'VPs of Sales at Bay Area voice AI startups " +
            "that shipped a product in the last year', 'AI startups that " +
            "raised Series A in 2024' or 'fitness YouTubers in Brazil with " +
            "100k+ subscribers'. Built for long, verified lists: parallel " +
            "agents search the live web and check every candidate " +
            "against each criterion, so prefer it over a web search or " +
            "browser loop when you need more than a handful of results or " +
            "results you can trust without re-checking. Entity " +
            "types: companies, people, X/Twitter, YouTube, TikTok and " +
            "Instagram creators, Shopify stores, Xiaohongshu accounts and " +
            "WeChat Official Accounts. Each entity carries a name, links " +
            "(website, LinkedIn, social profiles), a description, a match " +
            "score with its reason, and any `enrich_fields` you asked for " +
            "(funding stage, headcount, ...). Exclude leads you already " +
            "have by name or by an earlier run's `leads_search_id`. " +
            "Asynchronous: the run returns once the search finishes. It " +
            "does not return emails or phone numbers — pipe entities into " +
            "Lev8 Contact Search for those.",
        docsUrl: "https://docs.lev8.com/api-reference/entity-search",
        categories: [
            "company-enrichment",
            "people-enrichment",
            "twitter",
            "youtube",
            "tiktok",
            "instagram",
        ],
        notes: [
            "`xiaohongshu` and `wechat` require `enable_web_search: true` " +
            "(otherwise 422, free) and usually take 1 to 2 minutes before " +
            "the first results.",
            "Cost: 5 startup credits (20 with `enable_web_search`) plus, " +
            "per returned entity, 10 credits for creator types and 2 for " +
            "every other type. Billed on the entities actually returned, " +
            "not on `limit`.",
            "A task that ends in `error` refunds the startup credits but " +
            "still returns and bills the entities it found; with none, the " +
            "run fails and costs nothing.",
            "The output's `leads_search_id` can be passed to a later run's " +
            "`dedup_lev8_leads` to exclude these results.",
            "There is no cancel: a started search runs to completion and " +
            "is billed even if the run is abandoned.",
        ],
    },
    endpoint: "/v1/entity-search",
    request: { method: "POST", path: "/v1/entity-search/create_task" },
    input: {
        schema: {
            // Lev8's documented defaults, at the binding (D25): both are
            // price selectors the estimate reads.
            body: zLev8EntitySearchBody.extend({
                limit: zLev8EntitySearchBody.shape.limit.unwrap().default(20),
                enable_web_search: zLev8EntitySearchBody.shape
                    .enable_web_search.unwrap().default(false),
            }),
        },
    },
    timeouts: { requestMs: 30_000, runMs: 1_800_000, pollMs: 10_000 },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":create_task",
                },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const id = utils.json.optionalGet(res.body, "$.leads_search_id");
            if (typeof id !== "string" || id === "") {
                throw Object.assign(
                    new Error("Lev8 create_task returned no leads_search_id"),
                    { retriable: false },
                );
            }
            logger.debug("lev8 entity search created", { id });
            return { kind: "RUNNING", state: { externalRunId: id } };
        },
        poll: async ({ data, utils, logger }) => {
            const id = data.lifecycle.state.externalRunId;
            if (id === undefined) {
                throw Object.assign(
                    new Error("lev8 poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const transient = (status: number) =>
                status === 408 || status === 429 || status >= 500;

            const st = await utils.http({
                method: "GET",
                path: "/v1/entity-search/status",
                queryParams: { leads_search_id: id },
            });
            if (transient(st.status)) {
                throw new Error("Lev8 status returned " + String(st.status));
            }
            if (st.status < 200 || st.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: st.status,
                    output: st.body,
                };
            }
            const status = utils.json.optionalGet(st.body, "$.status.status");
            if (status !== "done" && status !== "error") {
                // created | running — or a status we do not know, which is
                // still in flight, never a success
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: id,
                        ...(typeof status === "string"
                            ? { stage: status }
                            : {}),
                    },
                };
            }
            const ready = utils.json.optionalNum(
                st.body,
                "$.status.ready_count",
            ) ?? 0;
            const stopReason = utils.json.optionalGet(
                st.body,
                "$.status.stop_reason",
            );

            // read every ready entity; fetch may return fewer than `num`
            const entities: Json[] = [];
            let pts = 0;
            for (let page = 0; pts < ready && page < 100; page++) {
                const res = await utils.http({
                    method: "GET",
                    path: "/v1/entity-search/fetch",
                    queryParams: {
                        leads_search_id: id,
                        pts: String(pts),
                        num: String(Math.min(500, ready - pts)),
                    },
                });
                if (res.status < 200 || res.status >= 300) {
                    // the results are already billed upstream — retry the
                    // tick rather than settle without them
                    throw new Error(
                        "Lev8 fetch returned " + String(res.status),
                    );
                }
                const batch = utils.json.optionalGet(res.body, "$.entities");
                const count = Array.isArray(batch) ? batch.length : 0;
                if (count === 0) break;
                for (const e of batch as Json[]) entities.push(e);
                pts += count;
            }
            if (entities.length < ready) {
                logger.warn("lev8 fetch returned fewer entities than ready", {
                    id,
                    ready,
                    read: entities.length,
                });
            }

            const output = {
                leads_search_id: id,
                status,
                ...(typeof stopReason === "string"
                    ? { stop_reason: stopReason }
                    : {}),
                ready_count: ready,
                count: entities.length,
                entities,
            };
            if (status === "error" && ready === 0) {
                logger.warn("lev8 entity search failed with no results", {
                    id,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: st.status,
                    output: { ...output, error: "internal error" },
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: st.status,
                output,
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                startup: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.CREDIT,
                    label: "startup",
                    description: "5 credits per search, 20 with " +
                        "enable_web_search; refunded when the task errors",
                    consumes: { credit: "default", amount: 1 },
                },
                results: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "entities",
                    description: "companies, people, Shopify stores, " +
                        "Xiaohongshu and WeChat accounts returned",
                    consumes: { credit: "default", amount: 2 },
                },
                creator_results: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "creators",
                    description: "X, YouTube, TikTok and Instagram " +
                        "creators returned",
                    consumes: { credit: "default", amount: 10 },
                },
            },
        },
        /** Lev8's own reservation: startup + `limit` × per-result. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const line = body.entity_type.endsWith("_creator")
                ? "creator_results"
                : "results";
            return {
                counts: {
                    startup: body.enable_web_search ? 20 : 5,
                    [line]: body.limit,
                },
            };
        },
        /** Lev8's settlement: `done` bills startup + ready_count × rate;
         *  `error` bills ready_count only (startup refunded). */
        evidence: ({ data, utils }) => {
            const body = data.input.body;
            const line = body.entity_type.endsWith("_creator")
                ? "creator_results"
                : "results";
            const ready =
                utils.json.optionalNum(data.output, "$.ready_count") ??
                    0;
            const done = utils.json.optionalGet(data.output, "$.status") ===
                "done";
            return {
                counts: {
                    startup: done ? (body.enable_web_search ? 20 : 5) : 0,
                    [line]: ready,
                },
            };
        },
    },
});
