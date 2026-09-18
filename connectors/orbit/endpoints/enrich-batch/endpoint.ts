import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zBatchEnrichBody } from "./schema/inputs.ts";

/**
 * `POST /v3/enrich` — build up to 20 people's profiles with one operation.
 *
 * ASYNC, AND THE ONE ENDPOINT THAT FANS OUT. Orbit's batch has no parent
 * status route: the submit hands back one child `request_id` per normalized
 * profile, and each child reads back through
 * `GET /v3/enrich/requests/{request_id}`. The lifecycle does exactly what
 * Orbit asks a caller to do — polls the children that are still running,
 * then, once none are, reads every child once more so the output carries a
 * complete, current set of child snapshots under the parent envelope.
 *
 * Bounded by construction: 20 profiles is the vendor's own cap, child reads
 * are free, and only the still-running children are polled on each tick.
 * The reads of one tick go out TOGETHER: Orbit's status bucket refills at
 * 25/s with a burst of 150, so twenty concurrent reads sit inside it, and a
 * tick then takes as long as its slowest child rather than the sum.
 *
 * BILLING is the single-enrich rule, 20 times over: a child Orbit answered
 * `running` for is one it started building, and it draws its depth line when
 * it reaches that depth. Children already at the requested depth answer
 * terminally on the submit and settle at zero. `regenerate` rebuilds every
 * child, so every child draws.
 */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person Profiles (Batch)",
        summary: "Build up to 20 people's profiles in one call.",
        description: "Build up to 20 Orbit profiles with one operation and " +
            "get every finished profile back together. Same depths as the " +
            "single build: `partial` for a useful profile, `full` for the " +
            "deepest Orbit can build, and `regenerate` to force fresh " +
            "work — which can replace facts already on EVERY profile in " +
            "the list, so reach for it only when a refresh is what was " +
            "asked for. Takes Orbit profile ids or public slugs, " +
            "which `orbit#v3/search` returns; duplicates are normalized " +
            "before work starts. Reach for this when an agent holds a list " +
            "of people — a guest list, a roster, an account team, a " +
            "shortlist of candidates — and wants depth on all of them at " +
            "once. The result carries one " +
            "child per profile, each with its own status, depth and " +
            "profile. Profiles already at the depth you asked for come back " +
            "as they stand and cost nothing; the rest are 5 credits each " +
            "for `partial` and 10 each for `full` and `regenerate`. Use " +
            "`orbit#v3/search` first for anyone Orbit has yet to identify — " +
            "it returns the profile ids this endpoint takes.",
        docsUrl: "https://docs.orbitsearch.com/api/enrich-batch",
        categories: ["people-enrichment"],
    },
    request: { method: "POST", path: "/v3/enrich" },
    input: {
        schema: {
            body: zBatchEnrichBody.extend({
                include_profile: zBatchEnrichBody.shape.include_profile.unwrap()
                    .default(true),
            }),
        },
    },
    /** Twenty full builds run in parallel on Orbit's side; 20 minutes is the
     *  whole-run budget they live inside. */
    timeouts: { requestMs: 60_000, runMs: 1_200_000, pollMs: 10_000 },
    lifecycle: {
        state: z.strictObject({
            children: z.array(z.string()).describe(
                "Every child `request_id`, in the order Orbit returned them.",
            ),
            pending: z.array(z.string()).describe(
                "The children still running.",
            ),
            dispatched: z.array(z.string()).describe(
                "The children Orbit started building — the billing signal.",
            ),
            parentRequestId: z.string().describe("The batch's own id."),
        }),
        start: async ({ data, utils, logger }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const parent = utils.json.optionalGet(res.body, "$.request_id");
            const rows = utils.json.optionalGet(res.body, "$.results");
            if (!Array.isArray(rows)) {
                throw new Error("Orbit batch enrich returned no results list");
            }
            // `regenerate` rebuilds every child, so every child draws however
            // its submit answered.
            const rebuilding = data.input.body.operation === "regenerate";
            const children = [];
            const pending = [];
            const dispatched = [];
            for (const row of rows) {
                const id = utils.json.optionalGet(row, "$.request_id");
                if (typeof id !== "string" || id === "") continue;
                children.push(id);
                const status = utils.json.optionalGet(row, "$.status");
                if (status === "running") {
                    pending.push(id);
                    dispatched.push(id);
                } else if (rebuilding) dispatched.push(id);
            }
            const state = {
                data: {
                    children,
                    pending,
                    dispatched,
                    parentRequestId: typeof parent === "string" ? parent : "",
                },
            };
            if (pending.length === 0) {
                logger.info("orbit batch enrich settled on submit", {
                    children: children.length,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                    state,
                };
            }
            return { kind: "RUNNING", state };
        },
        poll: async ({ data, utils, logger }) => {
            const previous = data.lifecycle.state.data;
            if (previous === undefined) {
                throw Object.assign(
                    new Error("orbit batch enrich poll without state"),
                    { retriable: false },
                );
            }
            const read = (id: string) =>
                utils.http({
                    method: "GET",
                    path: "/v3/enrich/requests/" + encodeURIComponent(id),
                }).then((res) => ({ id, res }));
            const pending = [];
            let backoffMs = 0;
            const reads = await Promise.all(previous.pending.map(read));
            for (const { id, res } of reads) {
                if (
                    res.status === 408 || res.status === 429 ||
                    res.status >= 500
                ) {
                    // The child's status LOOKUP failed while the build keeps
                    // running and keeps drawing credits — hold the child open.
                    // Same retry class the two single-run lifecycles use, and
                    // the same `Retry-After` rule; the slowest child sets the
                    // next cadence.
                    const after = Number(res.headers["retry-after"]);
                    const wait = Number.isFinite(after) && after > 0
                        ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                        : 30_000;
                    if (wait > backoffMs) backoffMs = wait;
                    pending.push(id);
                    continue;
                }
                const status = res.status >= 200 && res.status < 300
                    ? utils.json.optionalGet(res.body, "$.status")
                    : "failed";
                if (status === "running" || status === undefined) {
                    pending.push(id);
                }
            }
            if (pending.length > 0) {
                if (backoffMs > 0) {
                    logger.warn("orbit batch child lookup transient", {
                        pending: pending.length,
                        pollAfterMs: backoffMs,
                    });
                }
                return {
                    kind: "RUNNING",
                    state: { data: { ...previous, pending } },
                    ...(backoffMs > 0 ? { pollAfterMs: backoffMs } : {}),
                };
            }
            // Every child is terminal. Read them ALL once — including the
            // ones that finished on the submit — so the batch envelope
            // carries one current snapshot per profile. Child reads are free.
            const results = [];
            const reopened = [];
            let errored = false;
            let finalBackoffMs = 0;
            const finalReads = await Promise.all(previous.children.map(read));
            for (const { id, res } of finalReads) {
                if (
                    res.status === 408 || res.status === 429 ||
                    res.status >= 500
                ) {
                    // The FINAL read is the same lookup the poll above makes,
                    // so it gets the same answer: a transient failure says
                    // nothing about the child. Re-open it rather than
                    // publishing a `failed` row — that row would also drop
                    // the child's depth line from evidence, settling a build
                    // Orbit charged for at zero.
                    const after = Number(res.headers["retry-after"]);
                    const wait = Number.isFinite(after) && after > 0
                        ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                        : 30_000;
                    if (wait > finalBackoffMs) finalBackoffMs = wait;
                    reopened.push(id);
                    continue;
                }
                if (res.status < 200 || res.status >= 300) {
                    errored = true;
                    results.push({
                        request_id: id,
                        status: "failed",
                        error: res.body,
                    });
                    continue;
                }
                if (
                    utils.json.optionalGet(res.body, "$.status") !== "completed"
                ) {
                    errored = true;
                }
                results.push(res.body);
            }
            if (reopened.length > 0) {
                logger.warn("orbit batch final read transient", {
                    reopened: reopened.length,
                    pollAfterMs: finalBackoffMs,
                });
                return {
                    kind: "RUNNING",
                    state: { data: { ...previous, pending: reopened } },
                    pollAfterMs: finalBackoffMs,
                };
            }
            logger.info("orbit batch enrich settled", {
                children: results.length,
            });
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: {
                    request_id: previous.parentRequestId,
                    status: errored ? "completed_with_errors" : "completed",
                    results,
                },
                state: { data: { ...previous, pending: [] } },
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                partial_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 5 },
                    label: "partial profiles built",
                    description: "profiles built to partial depth",
                },
                full_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 10 },
                    label: "full profiles built",
                    description:
                        "profiles built to full depth, or rebuilt by " +
                        "`regenerate`",
                },
            },
        },
        /** The ceiling: every profile in the list needs its build. Duplicate
         *  ids normalize away on Orbit's side, which only ever lowers the
         *  settle. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const people = body.profile_ids.length;
            return {
                counts: body.operation === "partial"
                    ? { partial_profile: people }
                    : { full_profile: people },
            };
        },
        /** One depth line per child Orbit both STARTED building and finished
         *  at the depth asked for. */
        evidence: ({ data, utils }) => {
            const started = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.dispatched",
            );
            const dispatched = Array.isArray(started)
                ? started.map((id) => String(id))
                : [];
            const rows = utils.json.optionalGet(data.output, "$.results");
            // ONE operation applies to every profile in the batch, and the
            // request is where it is stated — required input, and what Orbit
            // priced. Each row's `generation_level` still says how deep that
            // child actually reached.
            const operation = data.input.body.operation;
            let partial = 0;
            let full = 0;
            if (Array.isArray(rows)) {
                for (const row of rows) {
                    const id = utils.json.optionalGet(row, "$.request_id");
                    if (typeof id !== "string" || !dispatched.includes(id)) {
                        continue;
                    }
                    if (
                        utils.json.optionalGet(row, "$.status") !== "completed"
                    ) {
                        continue;
                    }
                    const level = utils.json.optionalNum(
                        row,
                        "$.generation_level",
                    ) ?? 0;
                    if (operation === "partial") {
                        if (level >= 2) partial += 1;
                    } else if (level >= 3) full += 1;
                }
            }
            return {
                counts: {
                    ...(partial > 0 ? { partial_profile: partial } : {}),
                    ...(full > 0 ? { full_profile: full } : {}),
                },
            };
        },
    },
});
