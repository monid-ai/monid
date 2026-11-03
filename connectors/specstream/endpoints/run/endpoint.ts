import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRunBody } from "./schema/inputs.ts";

/**
 * `POST /v1/capacity/executions`: approve a signed quote and run the find.
 *
 * ASYNC (design D10/D21). A find runs for minutes, up to four hours for the
 * largest lists, so the endpoint is a durable job:
 *   `start`  POST /v1/capacity/executions                    -> reservation
 *   `poll`   GET  /v1/capacity/requests/{idempotency_key}/rows -> page + `done`
 *   `stop`   POST /v1/finds/{find_id}/cancel                  -> keep what was found
 * The job handle is the caller's own `idempotency_key`: SpecStream reads a
 * run back by it, and it is also what makes a retried start safe (the same key
 * never buys twice), so the run needs no state beyond it.
 *
 * The poll answers COMPLETED with SpecStream's own rows page: the first page of
 * matches (each cell with its `source_url` and `observed_at`), the `possible`
 * candidates, `next_cursor`, the `find_id` and the `commerce` receipt. More
 * than a page of rows is read with `specstream#v1/finds/{id}/rows`, which is
 * free; the cursor is passed through, never walked.
 *
 * BILLING. SpecStream charges per matching row (5 cents Standard, 15 cents
 * Expanded, 1 dollar Deep; +5 cents email, +15 cents phone; nothing for a row
 * that does not match or for a run that finds nothing) and settles ONE number:
 * `commerce.amount_captured_cents`. The receipt does not break that number into
 * tier and contact lines, so the model meters the captured cents one for one
 * (the firecrawl#agent posture) and does not pin a rate table it could not
 * back with evidence. That claim settles (design D27); the estimate is the
 * approved maximum, which SpecStream reserves from the account before it
 * starts. The poll completes only once the reservation is settled, so a run
 * is never claimed while its charge is still pending.
 */
export default defineEndpoint({
    meta: {
        displayName: "SpecStream Run Find",
        summary:
            "Approve a quote and run it: sourced rows, paid per matching result.",
        description:
            "Approve a signed quote and run the find. SpecStream finds the " +
            "rows on the live web and this call returns when the run ends, " +
            "with the first page of matching rows: every value carries the " +
            "`source_url` of the page it was read from and `observed_at`, " +
            "when it was read. Send the `quote_id`, `quote_hash` and " +
            "`maximum_cents` from `specstream#v1/capacity/quotes` (as " +
            "`confirm_max_cents`) and a stable `idempotency_key`; the run " +
            "never costs more than `confirm_max_cents`. Charged per matching " +
            "result at the rate the quote names (5 cents, 15 cents or $1 a " +
            "result by how much each needs, plus 5 cents for a person's " +
            "email and 15 cents for a phone); results that do not match cost " +
            "nothing and a run that finds nothing costs nothing. Only " +
            "approve a maximum your person has approved, unless they " +
            "delegated it to you. A run can take minutes, and up to four " +
            "hours for the largest lists. A longer result than one page " +
            "carries `next_cursor`; read the rest with " +
            "`specstream#v1/finds/{id}/rows` using `find_id`.",
        docsUrl: "https://specstream.ai/docs/api",
        categories: ["web-search"],
        notes: [
            "The key needs the `specs:write`, `finds:write` and " +
            "`finds:spend` scopes.",
            "Retrying with the same `idempotency_key` never starts a second " +
            "run; it returns the original one.",
            "`status` in the result is the find's end state. `canceled` and " +
            "`partial` runs keep, and are charged for, the matches found.",
            "Billing: the run is charged what SpecStream captured " +
            "(`commerce.amount_captured_cents`), never more than " +
            "`confirm_max_cents`. The estimate before the run is that " +
            "maximum.",
        ],
    },
    request: { method: "POST", path: "/v1/capacity/executions" },
    input: { schema: { body: zRunBody } },
    // long-running job: a find runs for minutes and up to four hours
    timeouts: { requestMs: 60_000, runMs: 4 * 60 * 60 * 1000, pollMs: 15_000 },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            const key = utils.json.get(data.input.body, "$.idempotency_key");
            if (typeof key !== "string" || key === "") {
                throw new Error("SpecStream run input has no idempotency_key");
            }
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                // an expired quote, a missing scope or a balance below the
                // maximum: DATA, zero-billed by the engine, nothing started
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            logger.info("specstream run reserved", { key });
            return { kind: "RUNNING", state: { externalRunId: key } };
        },
        poll: async ({ data, utils, logger }) => {
            const key = data.lifecycle.state.externalRunId;
            if (key === undefined) {
                throw Object.assign(
                    new Error("specstream poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: "/v1/capacity/requests/" + encodeURIComponent(key) +
                    "/rows",
            });
            if (
                res.status === 408 || res.status === 429 || res.status >= 500
            ) {
                // The status LOOKUP failed, not the run: the find keeps
                // working and its charge is reserved, so declaring the run
                // over here would abandon a live find. Bounded by runMs.
                logger.warn("specstream status lookup transient", {
                    key,
                    status: res.status,
                });
                return { kind: "RUNNING", pollAfterMs: 30_000 };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const done = utils.json.optionalGet(res.body, "$.data.done");
            const settlement = utils.json.optionalGet(
                res.body,
                "$.data.commerce.settlement_status",
            );
            if (done !== true || settlement === "pending") {
                // still working, or finished with its charge not yet settled
                // null once the find is done, so read it without a type gate
                const wait = utils.json.optionalGet(
                    res.body,
                    "$.data.retry_after_seconds",
                );
                return typeof wait !== "number" ? { kind: "RUNNING" } : {
                    kind: "RUNNING",
                    pollAfterMs: Math.max(1_000, Math.round(wait * 1000)),
                };
            }
            return { kind: "COMPLETED", httpStatus: 200, output: res.body };
        },
        stop: async ({ data, utils, logger }) => {
            const key = data.lifecycle.state.externalRunId;
            if (key === undefined) return;
            const rows = "/v1/capacity/requests/" + encodeURIComponent(key) +
                "/rows";
            const before = await utils.http({
                method: "GET",
                path: rows,
                queryParams: { limit: "1" },
            });
            const findId = utils.json.optionalGet(
                before.body,
                "$.data.find_id",
            );
            if (typeof findId !== "string") return;
            // cancel keeps what the find already matched, and that is charged
            await utils.http({
                method: "POST",
                path: "/v1/finds/" + encodeURIComponent(findId) + "/cancel",
            });
            const after = await utils.http({ method: "GET", path: rows });
            const done = utils.json.optionalGet(after.body, "$.data.done");
            const settlement = utils.json.optionalGet(
                after.body,
                "$.data.commerce.settlement_status",
            );
            if (
                after.status >= 200 && after.status < 300 && done === true &&
                settlement !== "pending"
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 200,
                    output: after.body,
                };
            }
            logger.warn("specstream cancel not yet settled", { findId });
            return {
                kind: "UNRESOLVED",
                reason: "cancel requested for find " + findId +
                    "; its charge has not settled yet",
            };
        },
    },
    usage: {
        /** SpecStream settles ONE number (see the header), so the meter is the
         *  cents it captured, one dollar-cent per unit. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "cents charged",
            description: "the cents SpecStream captured for the matching " +
                "results found (5, 15 or 100 cents a result, plus 5 for " +
                "an email and 15 for a phone)",
            consumes: { credit: "default", amount: 0.01 },
        },
        /** The vendor's OWN claim (design D27): the receipt on the settled
         *  rows page. Omitted when absent, so the derived fold stands in. */
        consolidate: ({ data, utils }) => {
            const cents = utils.json.optionalNum(
                data.output,
                "$.data.commerce.amount_captured_cents",
            );
            return {
                credits: {
                    ...(cents !== undefined ? { default: cents / 100 } : {}),
                },
            };
        },
        /** The ceiling the vendor itself enforces: the approved maximum is
         *  reserved from the account before the find starts. */
        estimate: ({ data }) => ({
            counts: { "CREDIT": data.input.body.confirm_max_cents },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                "CREDIT": utils.json.optionalNum(
                    data.output,
                    "$.data.commerce.amount_captured_cents",
                ) ?? 0,
            },
        }),
    },
});
