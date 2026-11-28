import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zCountCompaniesBody } from "./schema/inputs.ts";

/**
 * `POST /companies/count` — how many companies match a search, free.
 *
 * ASYNC ON A NEW COUNT, exactly as the people count: `202 pending` with the
 * `filters` being counted, then `200 ready` for the same request with those
 * filters. A `filters` count repeats its own request and keeps no state; a
 * `query` count sends the returned `filters`, never the `query` again, and
 * carries its `unresolvedCriteria` from the first answer to the final one.
 * A `429` on a repeat holds the run open on `Retry-After`; any other
 * non-2xx ends the run as data.
 *
 * `start` and `poll` are byte-identical to the people count's, so the two
 * endpoints share one fnTable entry each.
 */
export default defineEndpoint({
    meta: {
        displayName: "Count Companies",
        summary: "Count the companies a search would find, free.",
        description: "Count the companies a company search would find, " +
            "without listing them. Free: nothing is charged. Send exactly " +
            'one of `query`, such as "logistics companies in Portugal", or ' +
            "`filters`, as `outbound-dev#companies/search` takes them. The " +
            "answer carries `status` `ready`, `total` (the companies " +
            "matching) and `filters` (what was counted: send them to " +
            "`outbound-dev#companies/search` to list the companies), and " +
            "with a `query` also `unresolvedCriteria` (the parts no filter " +
            "could express). Use it to size a market before paying for rows.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/companies/count-companies",
        categories: ["company-enrichment"],
        notes: [
            "A new count runs in the background; the run waits for it. A " +
            "search counted recently answers at once.",
        ],
    },
    request: { method: "POST", path: "/companies/count" },
    input: { schema: { body: zCountCompaniesBody } },
    /** 3 minutes is the whole-run budget, as on the people count; every
     *  poll repeats the count request. */
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
