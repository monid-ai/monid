import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zCountCompaniesBody } from "./schema/inputs.ts";

/**
 * `POST /data/companies/count` — how many companies match a search, free.
 *
 * ASYNC ON A NEW COUNT. Fuse counts in the background, usually for a few
 * seconds: the first call answers `202` with `status: "pending"` and the
 * `filters` it is counting, and the same request with THOSE filters answers
 * `200 ready` once counted. The lifecycle repeats it until then, so one
 * monid run returns the total. A search counted in the last 15 minutes
 * answers `200` at once and never polls.
 *
 * The poll sends the returned `filters`, never the `query`: Fuse documents
 * that a repeated `query` is converted again and could count a different
 * search. A `query` count's `unresolvedCriteria` arrives on the first answer
 * only, so the lifecycle carries it to the final one.
 *
 * Each poll is a call against the key's `company_count` limit, so a `429`
 * holds the run open and waits out `Retry-After` (seconds, clamped to
 * [1s, 60s]) instead of ending a count that is still running. Any other
 * non-2xx ends the run as data, including the `503` of a count that failed.
 */
export default defineEndpoint({
    meta: {
        displayName: "Count Companies",
        summary:
            "Count the companies matching a plain-English description or company-search filters, free.",
        description: "Count how many companies match a plain-English " +
            "sentence or company-search filters (industry, headquarters " +
            "location, headcount, revenue, funding stage, technologies, " +
            "keywords). Free: nothing is charged and no companies are " +
            'listed. Send exactly one of `query`, e.g. "Series B fintech ' +
            'companies in New York with 50 to 200 employees", or `filters` ' +
            "in the `fuse#companies/search` vocabulary. The answer carries " +
            "`status` `ready`, `total` (the companies matching), `filters` " +
            "(what was counted: send them to `fuse#companies/search` to list " +
            "the companies) and, with a `query`, `unresolvedCriteria` (parts " +
            "of the sentence no filter could express). Use it to size or " +
            "tune a search before paying for rows.",
        categories: ["company-enrichment"],
        notes: [
            "A new count usually takes a few seconds; the run waits for it. " +
            "A search counted in the last 15 minutes answers at once.",
            "A count the company data provider fails or is too busy for " +
            "answers 503: retry in a minute.",
            "`filters.headquartersCity` names that geocode to nothing are " +
            "dropped; only when none resolves is the count refused (422 " +
            "CITY_FILTER_UNRESOLVED).",
        ],
    },
    request: { method: "POST", path: "/data/companies/count" },
    input: { schema: { body: zCountCompaniesBody } },
    /** A count usually ends in a few seconds, so the polls come sooner than
     *  the people count's; 3 minutes is the whole-run budget, and every
     *  poll repeats the count request. */
    timeouts: { requestMs: 30_000, runMs: 180_000, pollMs: 3_000 },
    lifecycle: {
        state: z.strictObject({
            countedFilters: z.string().describe(
                "The `filters` Fuse answered it is counting, as JSON: the " +
                    "body every poll sends back.",
            ),
            queryEchoes: z.string().describe(
                "The first answer's `unresolvedCriteria`, as JSON; only a " +
                    "`query` count carries it.",
            ).optional(),
        }),
        start: async ({ utils, logger }) => {
            const res = await utils.request();
            if (res.status !== 202) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const counted = utils.json.optionalGet(res.body, "$.filters");
            if (counted === undefined || counted === null) {
                throw new Error(
                    "Fuse answered 202 without the filters it counts",
                );
            }
            const unresolved = utils.json.optionalGet(
                res.body,
                "$.unresolvedCriteria",
            );
            logger.info("fuse company count pending", {});
            return {
                kind: "RUNNING",
                state: {
                    data: {
                        countedFilters: JSON.stringify(counted),
                        ...(unresolved !== undefined
                            ? {
                                queryEchoes: JSON.stringify({
                                    unresolvedCriteria: unresolved,
                                }),
                            }
                            : {}),
                    },
                },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const counting = data.lifecycle.state.data;
            if (counting === undefined) {
                throw Object.assign(
                    new Error(
                        "fuse company count poll without counted filters",
                    ),
                    { retriable: false },
                );
            }
            const res = await utils.request({
                body: { filters: JSON.parse(counting.countedFilters) },
            });
            if (res.status === 202) return { kind: "RUNNING" };
            if (res.status === 429) {
                // The count keeps running on Fuse's side; only this repeat
                // was refused. `Retry-After` is in SECONDS.
                const after = Number(res.headers["retry-after"]);
                const pollAfterMs = Number.isFinite(after) && after > 0
                    ? Math.min(Math.max(after * 1000, 1_000), 60_000)
                    : 15_000;
                logger.warn("fuse company count poll rate limited", {
                    pollAfterMs,
                });
                return { kind: "RUNNING", pollAfterMs };
            }
            if (res.status !== 200 || counting.queryEchoes === undefined) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: utils.json.merge(
                    res.body,
                    JSON.parse(counting.queryEchoes),
                ),
            };
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
