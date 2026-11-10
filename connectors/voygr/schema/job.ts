import { z } from "zod";
import type {
    HookLogger,
    Json,
    LifecycleOutcome,
    LifecycleStartData,
    LifecycleStopOutcome,
    LifecycleTickData,
    LifecycleUtils,
} from "@shared/core";

/**
 * VOYGR's batch jobs (`/v1/jobs/*`), as one async run per job: the shared
 * lifecycle of `voygr#validate-batch` and `voygr#enrich-batch`, and the
 * `{batch_id}` path of `voygr#get-job` and `voygr#cancel-job`.
 *
 * START posts the job with `Idempotency-Key: <runId>:job`. A submit that
 * answers 5xx, or gets no answer, may still have created the job; VOYGR
 * asks for a prompt retry with the same key and body, which replays the
 * job instead of making a second, so it is retried once. Any other
 * non-2xx comes back as data (the engine bills it 0). A 2xx starts polling
 * with the `batch_id`. A body with `places` (enrich-batch) is sent as
 * `{pois: [...]}`, every place carrying the shared options.
 *
 * POLL reads `GET /v1/jobs/{batch_id}` every 30 s, or at the job's ETA
 * when that is later, up to 5 minutes. `completed`, `failed` and
 * `cancelled` complete the run with the job as returned, download link
 * included. A read that answers 429 or 5xx, or gets no answer, says
 * nothing about the job, which keeps running and billing: it is read again
 * in 30 s, for as long as `runMs` allows; on the timeout the engine runs
 * STOP. Any other non-2xx completes as data.
 *
 * STOP cancels the job, then reads it once and completes with that read
 * (the rows already processed stay billed). A finished job answers the
 * cancel with its status unchanged. A cancel that fails, or a job that
 * cannot be read after it, is UNRESOLVED: the host reconciles before money
 * settles.
 *
 * These fns replace the provider relay, so each repeats its duties: no
 * owned sub-account answers 503 without a request (the relay's message,
 * word for word), and EVERY request carries `X-Sub-Account`.
 *
 * Closed terms: no imports, no captures. Both endpoints reference these
 * consts, so each phase is one fnTable entry (schema/job.test.ts).
 */

/** The `{batch_id}` path of `get-job` and `cancel-job`. Strict, so a
 *  typo'd key is refused here instead of reaching VOYGR. */
export const zBatchPathParams = z.strictObject({
    batch_id: z.string().min(1).describe(
        "The job's id: `batch_id` in the output of voygr#validate-batch " +
            "or voygr#enrich-batch.",
    ),
});

export const startJob = async (
    { data, utils }: {
        data: LifecycleStartData;
        utils: LifecycleUtils;
        logger: HookLogger;
    },
): Promise<LifecycleOutcome> => {
    const owned = await utils.resources.owned({
        resource: "voygr/sub-account",
    });
    if (owned.length === 0) {
        return {
            kind: "COMPLETED",
            httpStatus: 503,
            output: {
                code: "SUB_ACCOUNT_UNAVAILABLE",
                message: "This workspace has no VOYGR sub-account, " +
                    "so the request was not sent. Retry shortly.",
            },
        };
    }
    // enrich-batch: one set of options, sent on every place
    const { places, ...options } = (data.input.body ?? {}) as Record<
        string,
        Json
    >;
    const submit = {
        headers: {
            "X-Sub-Account": owned[0].externalId,
            "Idempotency-Key": data.run.runId + ":job",
        },
        ...(Array.isArray(places)
            ? {
                body: {
                    pois: places.map((place) => ({
                        ...(place as Record<string, Json>),
                        ...options,
                    })),
                },
            }
            : {}),
    };
    let res = await utils.request(submit).catch(() => null);
    if (res === null || res.status >= 500) {
        res = await utils.request(submit);
    }
    if (res.status < 200 || res.status >= 300) {
        return { kind: "COMPLETED", httpStatus: res.status, output: res.body };
    }
    const batchId = utils.json.optionalGet(res.body, "$.batch_id");
    if (typeof batchId !== "string" || batchId === "") {
        return {
            kind: "COMPLETED",
            httpStatus: 502,
            providerHttpStatus: res.status,
            output: {
                code: "MALFORMED_JOB",
                message: "VOYGR accepted the job but returned no batch_id.",
            },
        };
    }
    // the next read at the job's ETA (null when unknown), 30 s to 5 min
    const eta = utils.json.optionalGet(res.body, "$.eta_seconds");
    return {
        kind: "RUNNING",
        state: { externalRunId: batchId },
        pollAfterMs:
            Math.min(Math.max(typeof eta === "number" ? eta : 0, 30), 300) *
            1000,
    };
};

export const pollJob = async (
    { data, utils }: {
        data: LifecycleTickData;
        utils: LifecycleUtils;
        logger: HookLogger;
    },
): Promise<LifecycleOutcome> => {
    const owned = await utils.resources.owned({
        resource: "voygr/sub-account",
    });
    if (owned.length === 0) {
        return {
            kind: "COMPLETED",
            httpStatus: 503,
            output: {
                code: "SUB_ACCOUNT_UNAVAILABLE",
                message: "This workspace has no VOYGR sub-account, " +
                    "so the request was not sent. Retry shortly.",
            },
        };
    }
    const batchId = data.lifecycle.state.externalRunId;
    if (batchId === undefined) {
        throw Object.assign(
            new Error("voygr job poll without externalRunId in state"),
            { retriable: false },
        );
    }
    const res = await utils.http({
        method: "GET",
        path: "/v1/jobs/" + encodeURIComponent(batchId),
        headers: { "X-Sub-Account": owned[0].externalId },
    }).catch(() => null);
    // a busy, failing or lost read says nothing about the job: read again
    if (res === null || res.status === 429 || res.status >= 500) {
        return { kind: "RUNNING", pollAfterMs: 30_000 };
    }
    if (res.status < 200 || res.status >= 300) {
        return { kind: "COMPLETED", httpStatus: res.status, output: res.body };
    }
    const status = utils.json.optionalGet(res.body, "$.status");
    if (
        status === "completed" || status === "failed" ||
        status === "cancelled"
    ) {
        return { kind: "COMPLETED", httpStatus: res.status, output: res.body };
    }
    const eta = utils.json.optionalGet(res.body, "$.eta_seconds");
    return {
        kind: "RUNNING",
        pollAfterMs:
            Math.min(Math.max(typeof eta === "number" ? eta : 0, 30), 300) *
            1000,
    };
};

export const stopJob = async (
    { data, utils }: {
        data: LifecycleTickData;
        utils: LifecycleUtils;
        logger: HookLogger;
    },
): Promise<LifecycleStopOutcome> => {
    const owned = await utils.resources.owned({
        resource: "voygr/sub-account",
    });
    if (owned.length === 0) {
        return {
            kind: "COMPLETED",
            httpStatus: 503,
            output: {
                code: "SUB_ACCOUNT_UNAVAILABLE",
                message: "This workspace has no VOYGR sub-account, " +
                    "so the request was not sent. Retry shortly.",
            },
        };
    }
    const batchId = data.lifecycle.state.externalRunId;
    if (batchId === undefined) {
        return {
            kind: "UNRESOLVED",
            reason: "no batch id in state: nothing to cancel",
        };
    }
    const headers = { "X-Sub-Account": owned[0].externalId };
    const path = "/v1/jobs/" + encodeURIComponent(batchId);
    const cancel = await utils.http({ method: "DELETE", path, headers })
        .catch(() => null);
    if (cancel === null || cancel.status < 200 || cancel.status >= 300) {
        return {
            kind: "UNRESOLVED",
            reason: "cancel failed" +
                (cancel === null ? "" : " with HTTP " + cancel.status),
            state: { externalRunId: batchId },
        };
    }
    const res = await utils.http({ method: "GET", path, headers })
        .catch(() => null);
    if (res === null || res.status < 200 || res.status >= 300) {
        return {
            kind: "UNRESOLVED",
            reason: "the job could not be read after the cancel",
            state: { externalRunId: batchId },
        };
    }
    return { kind: "COMPLETED", httpStatus: res.status, output: res.body };
};
