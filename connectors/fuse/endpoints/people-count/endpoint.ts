import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zCountPeopleBody } from "./schema/inputs.ts";

/**
 * `POST /data/people/count` — how many people match a search, free.
 *
 * ASYNC ON A NEW COUNT. Fuse counts in the background for up to about a
 * minute and a half: the first call answers `202` with `status: "pending"`
 * and the `filters` it is counting, and the same request with THOSE filters
 * answers `200 ready` once counted. The lifecycle repeats it until then, so
 * one monid run returns the total. A search counted in the last 15 minutes
 * answers `200` at once and never polls.
 *
 * The poll sends the returned `filters`, never the `query`: Fuse documents
 * that a repeated `query` is converted again and could count a different
 * search. A `query` count's `unresolvedCriteria` and `closestCompanyMatches`
 * arrive on the first answer only, so the lifecycle carries them to the
 * final one.
 *
 * Each poll is a call against the key's `people_count` limit, so a `429`
 * holds the run open and waits out `Retry-After` (seconds, clamped to
 * [1s, 60s]) instead of ending a count that is still running. Any other
 * non-2xx ends the run as data, including the `503` of a count that failed.
 */
export default defineEndpoint({
    meta: {
        displayName: "Count People",
        summary:
            "Count the people matching a plain-English description or people-search filters, free.",
        description: "Count how many people match a plain-English " +
            "sentence or people-search filters (job title, seniority, " +
            "department, employer, industry, location, headcount). Free: " +
            "nothing is charged, and no names or contact details come back. " +
            'Send exactly one of `query`, e.g. "VPs of sales at fintech ' +
            'companies in New York", or `filters` in the ' +
            "`fuse#prospects/search` vocabulary. The answer carries `status` " +
            "`ready`, `total` (the people matching), `filters` (what was " +
            "counted: send them to `fuse#prospects/search` to list the " +
            "people), and with a `query` also `unresolvedCriteria` (parts of " +
            "the sentence no filter could express) and " +
            "`closestCompanyMatches` (each company the sentence named that " +
            "Smart Search chose between same-named companies for). Use it to " +
            "size or tune a search before paying for rows.",
        categories: ["people-enrichment"],
        notes: [
            "A new count takes up to about a minute and a half; the run " +
            "waits for it. A search counted in the last 15 minutes answers " +
            "at once.",
            "Fuse starts at most 10 new counts a minute for the account " +
            "behind this connector; past that a new count answers 503 for a " +
            "minute: retry.",
        ],
    },
    request: { method: "POST", path: "/data/people/count" },
    input: { schema: { body: zCountPeopleBody } },
    /** Fuse counts for up to about 90 s; 3 minutes is the whole-run
     *  budget, and every poll repeats the count request. */
    timeouts: { requestMs: 30_000, runMs: 180_000, pollMs: 5_000 },
    lifecycle: {
        state: z.strictObject({
            countedFilters: z.string().describe(
                "The `filters` Fuse answered it is counting, as JSON: the " +
                    "body every poll sends back.",
            ),
            queryEchoes: z.string().describe(
                "The first answer's `unresolvedCriteria` and " +
                    "`closestCompanyMatches`, as JSON; only a `query` count " +
                    "carries them.",
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
            const matches = utils.json.optionalGet(
                res.body,
                "$.closestCompanyMatches",
            );
            logger.info("fuse people count pending", {});
            return {
                kind: "RUNNING",
                state: {
                    data: {
                        countedFilters: JSON.stringify(counted),
                        ...(unresolved !== undefined || matches !== undefined
                            ? {
                                queryEchoes: JSON.stringify({
                                    ...(unresolved !== undefined
                                        ? { unresolvedCriteria: unresolved }
                                        : {}),
                                    ...(matches !== undefined
                                        ? { closestCompanyMatches: matches }
                                        : {}),
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
                    new Error("fuse people count poll without counted filters"),
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
                logger.warn("fuse people count poll rate limited", {
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
