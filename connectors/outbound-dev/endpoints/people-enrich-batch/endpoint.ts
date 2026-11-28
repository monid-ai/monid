import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEnrichBatchBody } from "./schema/inputs.ts";

/**
 * `POST /people/enrich/batch` — find emails and phone numbers for up to 100
 * people in one background job.
 *
 * ASYNC. The submit answers `202` with the job; the lifecycle reads
 * `GET /v1/jobs/{jobId}` until its `status` leaves `running` (`succeeded`,
 * `failed` or `cancelled`), so one monid run returns every person's result.
 * The read is a path on the doc's own origin, so the engine injects the key.
 * outbound.dev refreshes a job's status at most every 15 seconds, which is
 * the poll cadence.
 *
 * THE SUBMIT CARRIES `Idempotency-Key: {runId}:submit` — the host-stable
 * run id (design D34). outbound.dev binds the key to the request body and
 * answers a repeat with the job it already started, so a retried start
 * converges on one job instead of paying for a second. It starts the job
 * inside the submit and can take two minutes over it, so the submit waits
 * that long; a repeat that arrives while the first is still being answered
 * gets `409 idempotency_in_progress`, which fails the attempt (retriable)
 * rather than end the run beside a job nobody is watching.
 *
 * ONE READ-RETRY RULE: a read answering `408`, `429` or any `5xx` is a
 * lookup that failed while the job keeps running, so it holds the run open.
 * `Retry-After` is in SECONDS; it sets the next tick, clamped to [1s, 120s].
 *
 * A STOPPED RUN CANCELS THE JOB (`POST /v1/jobs/{jobId}/cancel`, sent again
 * while outbound.dev refuses it), then watches it wind down for up to 105
 * seconds: outbound.dev keeps and charges what the job found before it
 * stopped, so the run settles on the `cancelled` job rather than leave that
 * charge unaccounted for. A job still running after the watch is
 * `UNRESOLVED`.
 *
 * BILLING: the job's `units` say how many values it found on each price
 * line (the evidence), and its `chargedUsd` is outbound.dev's own total for
 * them (the claim, lifted out of the payload). A `failed` or `cancelled`
 * job settles the same way: what it found comes back, charged as
 * outbound.dev charged it. A job outbound.dev ended at NO charge counts
 * nothing, whatever `units` it still lists.
 */
export default defineEndpoint({
    meta: {
        displayName: "Enrich People in Bulk",
        summary:
            "Find work emails, phone numbers or both for up to 100 people in one job.",
        description: "Find work emails, phone numbers or both for up to " +
            "100 people in one run. Send `people`, each by LinkedIn URL or " +
            "by name and company, with `find` (`email`, `phone` or " +
            "`email_and_phone`) and `providers` as " +
            "`outbound-dev#people/enrich/email` takes it. Same prices as " +
            "the single lookups, per value found: a person nothing is found " +
            "for costs nothing. The run waits for the whole job and returns " +
            "its `status` (`succeeded`, `failed` or `cancelled`), " +
            "`progress`, `units` (what it found, by price line) and " +
            "`results` in the order the people were sent, each with its " +
            "`index`, `emails`, `phones`, `primaryEmail`, `primaryPhone` " +
            "and `found`, or an `error` when that person was not enriched " +
            "(`person_not_identifiable`, `enrichment_in_progress`, " +
            "`enrichment_failed`, `enrichment_not_run`). `maxSpendUsd` caps what the job can " +
            "cost. For one person, `outbound-dev#people/enrich/email` and " +
            "`outbound-dev#people/enrich/phone` answer in one call.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/enrichment/enrich-people-in-a-batch",
        categories: ["people-enrichment"],
        notes: [
            "Per value found, by who found it: an email $0.02 from " +
            "outbound.dev's own data or $0.05 from a further provider, a " +
            "phone number $0.05 or $0.10. Further providers run only with " +
            '`providers: "waterfall"`.',
            "A person named twice is enriched, and charged, once.",
            "Values a job found are charged even when it fails or is " +
            "cancelled; people it never reached are not.",
        ],
    },
    request: { method: "POST", path: "/people/enrich/batch" },
    input: { schema: { body: zEnrichBatchBody } },
    /** A waterfall job of 100 people takes several minutes. 30 minutes is
     *  the whole-run budget; outbound.dev refreshes a job's status at most
     *  every 15 seconds, so that is the poll cadence. */
    timeouts: { requestMs: 30_000, runMs: 1_800_000, pollMs: 15_000 },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":submit",
                },
                // outbound.dev holds for the job and starts it inside this
                // request, waiting up to two minutes for the start.
                requestMs: 125_000,
            });
            if (
                res.status === 409 &&
                utils.json.optionalGet(res.body, "$.error.code") ===
                    "idempotency_in_progress"
            ) {
                // An earlier attempt of this same start is still being
                // answered and may yet start the job. Fail this attempt, so
                // a retry meets that answer instead of the run ending
                // beside a job nobody is watching.
                throw new Error(
                    "outbound.dev is still answering this run's earlier start",
                );
            }
            if (res.status !== 202) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const jobId = utils.json.optionalGet(res.body, "$.id");
            if (typeof jobId !== "string" || jobId === "") {
                throw new Error("outbound.dev did not return a job id");
            }
            logger.info("outbound.dev enrichment job started", { jobId });
            return { kind: "RUNNING", state: { externalRunId: jobId } };
        },
        poll: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) {
                throw Object.assign(
                    new Error("outbound.dev job poll without externalRunId"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: "/v1/jobs/" + encodeURIComponent(jobId),
            });
            if (res.status === 408 || res.status === 429 || res.status >= 500) {
                const after = Number(res.headers["retry-after"]);
                const pollAfterMs = Number.isFinite(after) && after > 0
                    ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                    : 15_000;
                logger.warn("outbound.dev job read transient", {
                    jobId,
                    status: res.status,
                    pollAfterMs,
                });
                return { kind: "RUNNING", pollAfterMs };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "running") return { kind: "RUNNING" };
            logger.info("outbound.dev enrichment job ended", {
                jobId,
                status: String(status),
            });
            return { kind: "COMPLETED", httpStatus: 200, output: res.body };
        },
        stop: async ({ data, utils, logger }) => {
            const jobId = data.lifecycle.state.externalRunId;
            if (jobId === undefined) return;
            const path = "/v1/jobs/" + encodeURIComponent(jobId);
            // A job still starting refuses its cancel (409 `job_starting`),
            // so the cancel is sent again until it is taken. One that
            // already ended refuses it too, and reads terminal at once; a
            // cancelled one winds down first. Eight reads, 15 s apart.
            let isCancelTaken = false;
            for (let attempt = 0; attempt < 8; attempt++) {
                if (attempt > 0) await utils.sleep(15_000);
                if (!isCancelTaken) {
                    const cancel = await utils.http({
                        method: "POST",
                        path: path + "/cancel",
                    });
                    isCancelTaken = cancel.status >= 200 && cancel.status < 300;
                    logger.info("outbound.dev enrichment job cancel", {
                        jobId,
                        status: cancel.status,
                    });
                }
                const res = await utils.http({ method: "GET", path });
                if (
                    res.status === 200 &&
                    utils.json.optionalGet(res.body, "$.status") !== "running"
                ) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 200,
                        output: res.body,
                    };
                }
            }
            return {
                kind: "UNRESOLVED",
                reason: "outbound.dev job " + jobId +
                    " was still running after its cancel",
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                email_found_package: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.02 },
                    label: "emails found by the package",
                    description: "work emails outbound.dev's own data found",
                },
                email_found_waterfall: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.05 },
                    label: "emails found by the waterfall",
                    description: "work emails a further provider found",
                },
                phone_found_package: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.05 },
                    label: "phones found by the package",
                    description: "phone numbers outbound.dev's own data found",
                },
                phone_found_waterfall: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.1 },
                    label: "phones found by the waterfall",
                    description: "phone numbers a further provider found",
                },
            },
        },
        /** Every person found on every kind asked, at the dearest line the
         *  request can reach: what outbound.dev itself holds when the job
         *  starts. `find` defaults to `email`, `providers` to `package`. */
        estimate: ({ data }) => {
            const people = data.input.body.people.length;
            const find = data.input.body.find;
            const emails = find === "phone" ? 0 : people;
            const phones = find === "phone" || find === "email_and_phone"
                ? people
                : 0;
            const waterfall = data.input.body.providers === "waterfall";
            return {
                counts: {
                    email_found_package: waterfall ? 0 : emails,
                    email_found_waterfall: waterfall ? emails : 0,
                    phone_found_package: waterfall ? 0 : phones,
                    phone_found_waterfall: waterfall ? phones : 0,
                },
            };
        },
        /** The job's own `units`: `[{item, units}]`, one entry per price
         *  line it found something on. */
        evidence: ({ data, utils }) => {
            const counts = {
                email_found_package: 0,
                email_found_waterfall: 0,
                phone_found_package: 0,
                phone_found_waterfall: 0,
            };
            // A job outbound.dev ended at no charge (it was lost, or ended
            // with nothing it could prove) keeps the `units` of its last
            // progress read. Nothing was charged, so nothing counts: a zero
            // claim is pruned, and the fold over those units would bill.
            const charged = utils.json.optionalGet(data.output, "$.chargedUsd");
            if (typeof charged === "string" && Number(charged) === 0) {
                return { counts };
            }
            const units = utils.json.optionalGet(data.output, "$.units");
            for (const line of Array.isArray(units) ? units : []) {
                if (
                    typeof line !== "object" || line === null ||
                    Array.isArray(line) || typeof line.units !== "number"
                ) continue;
                if (line.item === "email_found_package") {
                    counts.email_found_package += line.units;
                } else if (line.item === "email_found_waterfall") {
                    counts.email_found_waterfall += line.units;
                } else if (line.item === "phone_found_package") {
                    counts.phone_found_package += line.units;
                } else if (line.item === "phone_found_waterfall") {
                    counts.phone_found_waterfall += line.units;
                }
            }
            return { counts };
        },
        /** THE VENDOR'S OWN CLAIM (design D27): `chargedUsd`, an exact
         *  six-decimal string present once the job ended, lifted out of the
         *  payload. Omitted when absent, so the fold over `units` settles. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.chargedUsd",
            );
            const charged = typeof value === "string" ? Number(value) : NaN;
            return {
                credits: {
                    ...(Number.isFinite(charged) ? { default: charged } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["personId"]),
    },
});
