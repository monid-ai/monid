import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zCountPeopleBody } from "./schema/inputs.ts";

/**
 * `POST /people/count` — how many people match a search, free.
 *
 * ASYNC ON A NEW COUNT. outbound.dev counts in the background for up to
 * about a minute and a half: the first call answers `202` with `status:
 * "pending"` and the `filters` it is counting, and the same request with
 * THOSE filters answers `200 ready` once counted. The lifecycle repeats it
 * until then, so one monid run returns the total. A search counted recently
 * answers `200` at once and never polls.
 *
 * A `filters` count repeats its own request, as outbound.dev documents,
 * and keeps no state. A `query` count sends the returned `filters`, never
 * the `query` again: a repeated `query` is turned into filters again and
 * could count a different search. Its `unresolvedCriteria` and
 * `closestCompanyMatches` arrive with the conversion, so the lifecycle
 * carries them from the first answer to the final one.
 *
 * Each poll is a call against the count limit of the organization behind
 * the key, which every caller shares, so a `429` holds the run open and
 * waits out `Retry-After` (seconds, clamped to [1s, 60s]) instead of ending
 * a count that is still running. Any other non-2xx ends the run as data.
 *
 * `start` and `poll` are byte-identical to the company count's, so the two
 * endpoints share one fnTable entry each.
 */
export default defineEndpoint({
    meta: {
        displayName: "Count Leads",
        summary:
            "Count the people a search would find, free, before paying for any.",
        description: "Count the people a people search would find, without " +
            "listing them. Free: nothing is charged, and no names come " +
            'back. Send exactly one of `query`, such as "operations ' +
            'directors at logistics companies in Portugal", or `filters`, ' +
            "as `outbound-dev#people/search` takes them. The answer carries " +
            "`status` `ready`, `total` (the people matching) and `filters` " +
            "(what was counted: send them to `outbound-dev#people/search` " +
            "to list the people), and with a `query` also " +
            "`unresolvedCriteria` (the parts no filter could express) and " +
            "`closestCompanyMatches`. Use it to size or tune a search " +
            "before paying for rows.",
        docsUrl: "https://docs.outbound.dev/api-reference/people/count-people",
        categories: ["people-enrichment"],
        notes: [
            "A new count takes up to about a minute and a half; the run " +
            "waits for it. A search counted recently answers at once.",
        ],
    },
    request: { method: "POST", path: "/people/count" },
    input: { schema: { body: zCountPeopleBody } },
    /** outbound.dev counts for up to about 90 s; 3 minutes is the whole-run
     *  budget, and every poll repeats the count request. */
    timeouts: { requestMs: 60_000, runMs: 180_000, pollMs: 5_000 },
    lifecycle: {
        state: z.strictObject({
            countedFilters: z.string().describe(
                "The `filters` outbound.dev answered it is counting for a " +
                    "`query`, as JSON: the body every poll sends back.",
            ),
            queryEchoes: z.string().describe(
                "The first answer's `unresolvedCriteria` and " +
                    "`closestCompanyMatches`, as JSON, when it carried any.",
            ).optional(),
        }),
        start: async ({ data, utils, logger }) => {
            const res = await utils.request();
            if (res.status !== 202) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            logger.info("outbound.dev count pending", {});
            // A `filters` count repeats its own request, so it keeps no
            // state: only a `query` count has filters to carry.
            const query = utils.json.optionalGet(
                data.input.body ?? {},
                "$.query",
            );
            if (query === undefined) return { kind: "RUNNING" };
            const counted = utils.json.optionalGet(res.body, "$.filters");
            if (counted === undefined || counted === null) {
                throw new Error(
                    "outbound.dev answered 202 without the filters it counts",
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
            const res = counting === undefined
                ? await utils.request()
                : await utils.request({
                    body: { filters: JSON.parse(counting.countedFilters) },
                });
            if (res.status === 202) return { kind: "RUNNING" };
            if (res.status === 429) {
                // The count keeps running on outbound.dev's side; only this
                // repeat was refused. `Retry-After` is in SECONDS.
                const after = Number(res.headers["retry-after"]);
                const pollAfterMs = Number.isFinite(after) && after > 0
                    ? Math.min(Math.max(after * 1000, 1_000), 60_000)
                    : 15_000;
                logger.warn("outbound.dev count poll rate limited", {
                    pollAfterMs,
                });
                return { kind: "RUNNING", pollAfterMs };
            }
            if (res.status !== 200 || counting?.queryEchoes === undefined) {
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
