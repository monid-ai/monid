// No live test: a live batch job costs credits.
import { assert, assertEquals, assertRejects } from "@std/assert";
import {
    type Json,
    type RunInput,
    RunKind,
    type RunState,
    StopKind,
} from "@shared/core";
import {
    assertInputAccepted,
    loadEndpoint,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { harness, OWNED, SUB_ID } from "../../test-support.ts";

/**
 * `voygr#validate-batch`: the run is the job. `happy` and `stop-cancelled`
 * were recorded live; the rest is stubbed from the shapes they show (the
 * job API's `ValidationJobStatus`). The lifecycle fns are the ones
 * `voygr#enrich-batch` runs too (schema/job.test.ts pins that), so the
 * job protocol's edges are tested here once.
 */

const ID = "voygr#validate-batch";
const h = harness(ID, import.meta.url);
const BASE = "https://api.voygr.tech";
const RUN = { runId: "run-1" };
const ZERO = { credits: {}, evidence: {} };
const BATCH = "batch_01M5YB5CABS9NJ8C5B9WD5YR6V";
const JOB_URL = `${BASE}/v1/jobs/${BATCH}`;

const POIS = [
    {
        id: "blue-bottle-mint",
        poi_name: "Blue Bottle Coffee",
        address: "66 Mint St, San Francisco, CA 94103",
        country: "US",
    },
    {
        id: "tartine-guerrero",
        poi_name: "Tartine Bakery",
        address: "600 Guerrero St, San Francisco, CA 94110",
        country: "US",
    },
    {
        id: "philz-24th",
        poi_name: "Philz Coffee",
        address: "3101 24th St, San Francisco, CA 94110",
        country: "US",
    },
];
const INPUT: RunInput = { body: { pois: POIS } };

const SUBMITTED = {
    batch_id: BATCH,
    type: "validate",
    status: "queued",
    total_items: 3,
    eta_seconds: 2,
};

/** A job as a read returns it. */
const job = (
    status: string,
    progress: [number, number, number],
    extra: Record<string, Json> = {},
) => ({
    batch_id: BATCH,
    type: "validate",
    status,
    total_items: 3,
    progress: {
        processed: progress[0],
        succeeded: progress[1],
        failed: progress[2],
    },
    ...extra,
});

/** Answers each request in turn from `script`, recording the wire. */
function wireScript(script: [number, Json | "throws"][]) {
    let next = 0;
    return h.wireWith(() => {
        const [status, body] = script[Math.min(next++, script.length - 1)];
        if (body === "throws") throw new Error("connection reset");
        return Response.json(body, { status });
    });
}

/** A wire for a whole run: the submit, then `read` for every GET and
 *  `cancel` for the DELETE. */
function wireJob(read: () => Response, cancel?: () => Response) {
    return h.wireWith((_url, method) =>
        method === "POST"
            ? Response.json(SUBMITTED)
            : method === "DELETE"
            ? (cancel ?? (() => Response.json({ status: "cancelled" })))()
            : read()
    );
}

/** A run state as `start` leaves it. */
async function startedState(): Promise<RunState> {
    const { loaded } = await h.wire(200, SUBMITTED);
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    return started.state;
}

async function rejectsInput(input: RunInput, shape: string) {
    const unit = await testSealedUnit(ID);
    await assertRejects(
        () => runEndpoint({ unit, input, mode: "replay", resources: [OWNED] }),
        Error,
        "INVALID_INPUT",
        shape,
    );
}

// ---------------------------------------------------------------------------
// the run: submit, poll, bill
// ---------------------------------------------------------------------------

Deno.test("validate-batch bills succeeded", async () => {
    const result = await h.run("happy", INPUT);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.evidence, { CREDIT: 3 });
    assertEquals(result.usage.credits, { default: 3 });
    // the running read, then the completed one
    assertEquals(result.timing.attempts, 2);
    // the job as VOYGR returned it, download link included
    const recorded = (await h.fixture("happy")).calls[2].res.body;
    assertEquals(result.output, recorded);
    const out = result.output as {
        status: string;
        progress: Json;
        results: { files: { url: string; expires_at: string }[] };
    };
    assertEquals(out.status, "completed");
    assertEquals(out.progress, { processed: 3, succeeded: 3, failed: 0 });
    assertEquals(
        out.results.files[0].url,
        "https://results.example.invalid/batches/" + BATCH +
            "/result.jsonl.gz",
    );
});

Deno.test("the estimate holds one credit per place", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        resources: [OWNED],
    });
    assertEquals(loaded.estimate(INPUT), {
        credits: { default: 3 },
        evidence: { CREDIT: 3 },
    });
    const one = { body: { pois: [POIS[0]] } };
    assertEquals(loaded.estimate(one).credits, { default: 1 });
});

Deno.test("every terminal status completes the run and bills the rows that succeeded", async () => {
    const terminal: [string, Record<string, Json>, [number, number, number]][] =
        [
            ["completed", {}, [3, 2, 1]],
            // a failed job keeps what it processed
            ["failed", {
                error: "The job stopped.",
                error_code: "INTERNAL_ERROR",
            }, [2, 2, 0]],
            ["cancelled", {}, [1, 1, 0]],
        ];
    for (const [status, extra, progress] of terminal) {
        const body = job(status, progress, extra);
        const { loaded } = await h.wire(200, body);
        const done = await loaded.poll(INPUT, await startedState(), RUN);
        assert(done.kind === RunKind.COMPLETED, status);
        assertEquals(done.httpStatus, 200, status);
        assertEquals(done.isProviderError, false, status);
        assertEquals(done.output, body, status);
        assertEquals(done.usage.evidence, { CREDIT: progress[1] }, status);
        assertEquals(done.usage.credits, { default: progress[1] }, status);
    }
    for (const status of ["queued", "running"]) {
        const { loaded } = await h.wire(200, job(status, [0, 0, 0]));
        const tick = await loaded.poll(INPUT, await startedState(), RUN);
        assert(tick.kind === RunKind.RUNNING, status);
        assertEquals(tick.state.externalRunId, BATCH, status);
    }
});

Deno.test("a completed job with every row failed bills 0", async () => {
    const { loaded } = await h.wire(200, job("completed", [3, 0, 3]));
    const done = await loaded.poll(INPUT, await startedState(), RUN);
    assert(done.kind === RunKind.COMPLETED);
    assertEquals(done.httpStatus, 200);
    assertEquals(done.usage, { credits: {}, evidence: { CREDIT: 0 } });
    assertEquals((done.output as { status: string }).status, "completed");
});

Deno.test("polls wait 30 s, or the job's ETA up to 5 minutes", async () => {
    const cases: [Json | undefined, number][] = [
        [undefined, 30_000],
        [null, 30_000],
        [1, 30_000],
        [-5, 30_000],
        [90, 90_000],
        [300, 300_000],
        [3_600, 300_000],
    ];
    for (const [eta, wait] of cases) {
        const extra: Record<string, Json> = eta === undefined
            ? {}
            : { eta_seconds: eta };
        const submit = await h.wire(200, { ...SUBMITTED, ...extra });
        const started = await submit.loaded.start(INPUT, RUN);
        assert(started.kind === RunKind.RUNNING);
        assertEquals(started.pollAfterMs, wait, `start, eta ${eta}`);

        const read = await h.wire(200, job("running", [0, 0, 0], extra));
        const tick = await read.loaded.poll(INPUT, started.state, RUN);
        assert(tick.kind === RunKind.RUNNING);
        assertEquals(tick.pollAfterMs, wait, `poll, eta ${eta}`);
    }
});

// ---------------------------------------------------------------------------
// submit: the wire, retries, refusals
// ---------------------------------------------------------------------------

Deno.test("submit sends the places as they are, with X-Sub-Account and the Idempotency-Key", async () => {
    const { loaded, sent } = await h.wire(200, SUBMITTED);
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    assertEquals(started.state.externalRunId, BATCH);
    assertEquals(sent.length, 1);
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].url, `${BASE}/v1/jobs/validate`);
    assertEquals(sent[0].headers.get("x-sub-account"), SUB_ID);
    assertEquals(sent[0].headers.get("idempotency-key"), "run-1:job");
    assertEquals(sent[0].headers.get("x-api-key"), "test-key");
    assertEquals(JSON.parse(sent[0].body!), { pois: POIS });
});

Deno.test("a submit that meets a server error or no answer is retried once with the same key and body", async () => {
    for (const first of [502, 503, 500, "throws"] as const) {
        const { loaded, sent } = await wireScript([
            first === "throws" ? [0, "throws"] : [first, { error: "busy" }],
            [200, SUBMITTED],
        ]);
        const started = await loaded.start(INPUT, RUN);
        assert(started.kind === RunKind.RUNNING, String(first));
        assertEquals(started.state.externalRunId, BATCH);
        assertEquals(sent.length, 2);
        for (const s of sent) {
            assertEquals([s.method, s.url], [
                "POST",
                `${BASE}/v1/jobs/validate`,
            ]);
            assertEquals(s.headers.get("idempotency-key"), "run-1:job");
            assertEquals(s.headers.get("x-sub-account"), SUB_ID);
            assertEquals(JSON.parse(s.body!), { pois: POIS });
        }
    }
});

Deno.test("a second server error settles as data after exactly two attempts", async () => {
    const busy = {
        success: false,
        error_code: "SUB_ACCOUNT_BACKEND_UNAVAILABLE",
    };
    const { loaded, sent } = await wireScript([[503, busy]]);
    const result = await loaded.start(INPUT, RUN);
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.output, busy);
    assertEquals(result.usage, ZERO);
    assertEquals(sent.length, 2);
});

Deno.test("other refusals come back as data after one request", async () => {
    const refusals: [number, Json][] = [
        [400, { error_code: "VALIDATION_ERROR" }],
        [402, { error_code: "INSUFFICIENT_CREDITS" }],
        [403, { error_code: "SUB_ACCOUNT_SUSPENDED" }],
        [409, { error_code: "IDEMPOTENCY_CONFLICT" }],
        [422, { detail: [{ msg: "Field required" }] }],
        [429, { error_code: "RATE_LIMITED" }],
    ];
    for (const [status, body] of refusals) {
        const { loaded, sent } = await wireScript([[status, body], [
            200,
            SUBMITTED,
        ]]);
        const result = await loaded.start(INPUT, RUN);
        assert(result.kind === RunKind.COMPLETED, String(status));
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.output, body);
        assertEquals(result.usage, ZERO);
        assertEquals(sent.length, 1, String(status));
    }
});

Deno.test("a 2xx without a batch id is a 502 at zero", async () => {
    for (
        const body of [{ status: "queued" }, { batch_id: "" }, null] as Json[]
    ) {
        const { loaded } = await h.wire(200, body);
        const result = await loaded.start(INPUT, RUN);
        assert(result.kind === RunKind.COMPLETED);
        assertEquals(result.httpStatus, 502);
        assertEquals(result.providerHttpStatus, 200);
        assertEquals(result.usage, ZERO);
    }
});

// ---------------------------------------------------------------------------
// poll edges
// ---------------------------------------------------------------------------

Deno.test("every poll and stop request carries X-Sub-Account", async () => {
    let cancelled = false;
    const wired = await wireJob(
        () =>
            Response.json(
                cancelled
                    ? job("cancelled", [1, 1, 0])
                    : job("running", [0, 0, 0]),
            ),
        () => {
            cancelled = true;
            return Response.json({ batch_id: BATCH, status: "cancelled" });
        },
    );
    const started = await wired.loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    const polled = await wired.loaded.poll(INPUT, started.state, RUN);
    assert(polled.kind === RunKind.RUNNING);
    const stopped = await wired.loaded.stop(INPUT, polled.state, RUN);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(wired.sent.map((s) => [s.method, s.url]), [
        ["POST", `${BASE}/v1/jobs/validate`],
        ["GET", JOB_URL],
        ["DELETE", JOB_URL],
        ["GET", JOB_URL],
    ]);
    for (const s of wired.sent) {
        assertEquals(s.headers.get("x-sub-account"), SUB_ID, s.url);
        assertEquals(s.headers.get("x-api-key"), "test-key", s.url);
    }
    // the reads and the cancel carry no body
    for (const s of wired.sent.slice(1)) {
        assertEquals(s.body, undefined, s.url);
    }
});

Deno.test("the batch id is encoded into one path segment", async () => {
    const { loaded, sent } = await h.wireWith((_url, method) =>
        method === "POST"
            ? Response.json({ ...SUBMITTED, batch_id: "a/b?c" })
            : Response.json(job("cancelled", [0, 0, 0]))
    );
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    await loaded.poll(INPUT, started.state, RUN);
    await loaded.stop(INPUT, started.state, RUN);
    const encoded = `${BASE}/v1/jobs/a%2Fb%3Fc`;
    assertEquals(sent.slice(1).map((s) => s.url), [encoded, encoded, encoded]);
});

Deno.test("a poll that meets 429, a server error or no answer keeps the run going", async () => {
    const state = await startedState();
    for (const status of [429, 500, 502, 503, 504, "throws"] as const) {
        const { loaded, sent } = await h.wireWith(() => {
            if (status === "throws") throw new Error("connection reset");
            return Response.json({ error: "busy" }, { status });
        });
        const tick = await loaded.poll(INPUT, state, RUN);
        assert(tick.kind === RunKind.RUNNING, String(status));
        assertEquals(tick.state.externalRunId, BATCH);
        assertEquals(tick.pollAfterMs, 30_000);
        assertEquals(sent.length, 1);
    }
});

Deno.test("a poll refusal that is not transient completes as data at zero", async () => {
    const missing = { success: false, error_code: "NOT_FOUND" };
    const { loaded } = await h.wire(404, missing);
    const tick = await loaded.poll(INPUT, await startedState(), RUN);
    assert(tick.kind === RunKind.COMPLETED);
    assertEquals(tick.httpStatus, 404);
    assertEquals(tick.isProviderError, true);
    assertEquals(tick.output, missing);
    assertEquals(tick.usage, ZERO);
});

Deno.test("a poll without a batch id in state fails without a request", async () => {
    const { externalRunId: _, ...noId } = await startedState();
    const { loaded, sent } = await h.wire(200, job("running", [0, 0, 0]));
    await assertRejects(
        () => loaded.poll(INPUT, noId, RUN),
        Error,
        "externalRunId",
    );
    assertEquals(sent, []);
});

// ---------------------------------------------------------------------------
// stop
// ---------------------------------------------------------------------------

Deno.test("stop cancels the job", async () => {
    const input = { body: { pois: [POIS[1]] } };
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input,
        mode: "replay",
        fixture: await h.fixture("stop-cancelled"),
        resources: [OWNED],
        scopeKey: "ws-1",
    });
    const started = await loaded.start(input, RUN);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(input, started.state, RUN);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(stopped.httpStatus, 200);
    assertEquals(
        stopped.output,
        (await h.fixture("stop-cancelled")).calls[2].res.body,
    );
    assertEquals((stopped.output as { status: string }).status, "cancelled");
    assertEquals(stopped.usage, { credits: {}, evidence: { CREDIT: 0 } });
});

Deno.test("stop bills the rows the job processed before the cancel", async () => {
    const { loaded } = await wireJob(() =>
        Response.json(job("cancelled", [2, 2, 0]))
    );
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(INPUT, started.state, RUN);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(stopped.usage.credits, { default: 2 });
});

Deno.test("a cancel that fails leaves the stop UNRESOLVED and reads nothing", async () => {
    for (const failure of [503, 404, "throws"] as const) {
        const { loaded, sent } = await wireJob(
            () => Response.json(job("running", [0, 0, 0])),
            () => {
                if (failure === "throws") throw new Error("connection reset");
                return Response.json({ error: "busy" }, { status: failure });
            },
        );
        const started = await loaded.start(INPUT, RUN);
        assert(started.kind === RunKind.RUNNING);
        const stopped = await loaded.stop(INPUT, started.state, RUN);
        assert(stopped.kind === StopKind.UNRESOLVED, String(failure));
        assertEquals(stopped.state.externalRunId, BATCH);
        // the submit and the cancel
        assertEquals(sent.length, 2);
    }
});

Deno.test("a job that cannot be read after the cancel leaves the stop UNRESOLVED", async () => {
    for (const failure of [503, 404, "throws"] as const) {
        const { loaded, sent } = await wireJob(() => {
            if (failure === "throws") throw new Error("connection reset");
            return Response.json({ error: "busy" }, { status: failure });
        });
        const started = await loaded.start(INPUT, RUN);
        assert(started.kind === RunKind.RUNNING);
        const stopped = await loaded.stop(INPUT, started.state, RUN);
        assert(stopped.kind === StopKind.UNRESOLVED, String(failure));
        assertEquals(stopped.state.externalRunId, BATCH);
        // the submit, the cancel and one read
        assertEquals(sent.length, 3);
    }
});

Deno.test("stop without a batch id is UNRESOLVED and sends nothing", async () => {
    const { externalRunId: _, ...noId } = await startedState();
    const { loaded, sent } = await h.wire(200, job("cancelled", [0, 0, 0]));
    const stopped = await loaded.stop(INPUT, noId, RUN);
    assertEquals(stopped.kind, StopKind.UNRESOLVED);
    assertEquals(sent, []);
});

// ---------------------------------------------------------------------------
// fail closed, binding, schema
// ---------------------------------------------------------------------------

Deno.test("validate-batch declares the sub-account binding", () =>
    h.assertBinding());

Deno.test("validate-batch fails closed without a sub-account, with no request at all", () =>
    h.assertFailsClosed(INPUT));

Deno.test("poll and stop fail closed without a sub-account, with no request", async () => {
    const state = await startedState();
    const { loaded, sent } = await h.wire(200, job("completed", [3, 3, 0]), []);
    const polled = await loaded.poll(INPUT, state, RUN);
    const stopped = await loaded.stop(INPUT, state, RUN);
    for (const tick of [polled, stopped]) {
        assert(tick.kind === RunKind.COMPLETED);
        assertEquals(tick.httpStatus, 503);
        assertEquals(tick.output, {
            code: "SUB_ACCOUNT_UNAVAILABLE",
            message: "This workspace has no VOYGR sub-account, so the " +
                "request was not sent. Retry shortly.",
        });
        assertEquals(tick.usage, ZERO);
    }
    assertEquals(sent, []);
});

Deno.test("validate-batch schema: 1 to 10,000 places, each with a name", async () => {
    const place = POIS[0];
    const rejected: [string, RunInput][] = [
        ["no body", {}],
        ["no places", { body: { pois: [] } }],
        ["10,001 places", {
            body: { pois: Array.from({ length: 10_001 }, () => place) },
        }],
        ["a place without a name", {
            body: { pois: [{ address: place.address }] },
        }],
        ["an empty name", { body: { pois: [{ ...place, poi_name: "" }] } }],
        ["a name over 200", {
            body: { pois: [{ ...place, poi_name: "x".repeat(201) }] },
        }],
        ["an id over 100", {
            body: { pois: [{ ...place, id: "x".repeat(101) }] },
        }],
        ["a latitude past 90", {
            body: { pois: [{ ...place, latitude: 91 }] },
        }],
        ["an unknown place key", {
            body: { pois: [{ ...place, phone: "+14155550100" }] },
        }],
        ["an unknown body key", { body: { pois: [place], sample: 1 } }],
    ];
    for (const [shape, input] of rejected) await rejectsInput(input, shape);

    const unit = await testSealedUnit(ID);
    const accepted: Json[] = [
        POIS,
        [{
            id: "p1",
            poi_name: "Tartine Bakery",
            street: "600 Guerrero St",
            city: "San Francisco",
            region: "CA",
            postcode: "94110",
            country: "US",
            latitude: 37.7614,
            longitude: -122.4241,
        }],
        Array.from({ length: 10_000 }, () => place),
    ];
    for (const pois of accepted) {
        await assertInputAccepted({
            unit,
            input: { body: { pois } },
            mode: "replay",
            fixture: await h.fixture("happy"),
            resources: [OWNED],
        });
    }
});
