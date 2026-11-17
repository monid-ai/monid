// No live test: a live batch job costs credits.
import { assert, assertEquals, assertRejects } from "@std/assert";
import { type Json, type RunInput, RunKind, type RunState } from "@shared/core";
import {
    assertInputAccepted,
    loadEndpoint,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { harness, OWNED, SUB_ID } from "../../test-support.ts";

/**
 * `voygr#enrich-batch`: one set of attributes and checks for every place,
 * so the bill is `succeeded × the price of one row`. `happy`,
 * `all-rows-failed` and `submit-typo-400` were recorded live. The job
 * protocol's edges (retries, poll failures, stop) are the shared fns that
 * validate-batch/endpoint.test.ts covers.
 */

const ID = "voygr#enrich-batch";
const h = harness(ID, import.meta.url);
const BASE = "https://api.voygr.tech";
const RUN = { runId: "run-1" };
const ZERO = { credits: {}, evidence: {} };
const BATCH = "batch_01M5YB5YDK0RCJ5B6GZ018V33F";
const JOB_URL = `${BASE}/v1/jobs/${BATCH}`;

const PLACES = [
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
const STANDARD = { attributes: ["opening_hours", "phone", "website"] };
const INPUT: RunInput = { body: { places: PLACES, ...STANDARD } };

/** 3 credits a row: the standard lane, one research field, one check. */
const PRICIER = {
    attributes: ["phone", {
        name: "wheelchair_accessible",
        value_type: "bool",
    }],
    verify_name: true,
};

const SUBMITTED = {
    batch_id: BATCH,
    type: "enrich",
    status: "queued",
    total_items: 3,
    eta_seconds: 1,
};

const job = (status: string, succeeded: number, failed: number) => ({
    batch_id: BATCH,
    type: "enrich",
    status,
    total_items: succeeded + failed,
    progress: { processed: succeeded + failed, succeeded, failed },
});

/** The engine over a stub: the submit, then `read` for every GET. */
function wireJob(read: () => Response) {
    return h.wireWith((_url, method) =>
        method === "POST"
            ? Response.json(SUBMITTED)
            : method === "DELETE"
            ? Response.json({ batch_id: BATCH, status: "cancelled" })
            : read()
    );
}

async function startedState(input: RunInput): Promise<RunState> {
    const { loaded } = await h.wire(200, SUBMITTED);
    const started = await loaded.start(input, RUN);
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
// the rows
// ---------------------------------------------------------------------------

Deno.test("enrich-batch sends shared options on every row", async () => {
    // the body the live job was submitted with
    const recorded = (await h.fixture("happy")).calls[0].req.body;
    const { loaded, sent } = await h.wire(200, SUBMITTED);
    await loaded.start(INPUT, RUN);
    assertEquals(sent.length, 1);
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].url, `${BASE}/v1/jobs/enrich`);
    assertEquals(JSON.parse(sent[0].body!), recorded);
});

Deno.test("every option rides on every row, and nothing else is added", async () => {
    const options: Record<string, Json> = {
        attributes: [
            "phone",
            { name: "owners", include: ["email"] },
            { name: "parking", description: "Has a car park?" },
        ],
        include_summary: true,
        validate_existence: true,
        verify_name: true,
        verify_address: true,
        verify_registered_address: true,
    };
    const places: Record<string, Json>[] = [
        { poi_name: "Tartine Bakery", latitude: 37.7614, longitude: -122.4241 },
        {
            id: "p2",
            poi_name: "Philz Coffee",
            street: "3101 24th St",
            city: "San Francisco",
            region: "CA",
            postcode: "94110",
            country: "US",
            registered_address: "3101 24th St, San Francisco, CA 94110",
        },
    ];
    const { loaded, sent } = await h.wire(200, SUBMITTED);
    await loaded.start({ body: { places, ...options } }, RUN);
    assertEquals(JSON.parse(sent[0].body!), {
        pois: [
            {
                poi_name: "Tartine Bakery",
                latitude: 37.7614,
                longitude: -122.4241,
                ...options,
            },
            {
                id: "p2",
                poi_name: "Philz Coffee",
                street: "3101 24th St",
                city: "San Francisco",
                region: "CA",
                postcode: "94110",
                country: "US",
                registered_address: "3101 24th St, San Francisco, CA 94110",
                ...options,
            },
        ],
    });
});

Deno.test("with no options, every row is the place as given", async () => {
    const { loaded, sent } = await h.wire(200, SUBMITTED);
    await loaded.start({ body: { places: PLACES } }, RUN);
    assertEquals(JSON.parse(sent[0].body!), { pois: PLACES });
});

// ---------------------------------------------------------------------------
// the bill
// ---------------------------------------------------------------------------

Deno.test("enrich-batch bills succeeded × row cost", async () => {
    // live: three standard-only rows, 1 credit each
    const result = await h.run("happy", INPUT);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.evidence, { CREDIT: 3 });
    assertEquals(result.usage.credits, { default: 3 });
    assertEquals(result.timing.attempts, 2);
    assertEquals(result.output, (await h.fixture("happy")).calls[2].res.body);

    // two of three rows succeed at 3 credits a row: 6
    const { loaded } = await wireJob(() =>
        Response.json(job("completed", 2, 1))
    );
    const input = { body: { places: PLACES, ...PRICIER } };
    const done = await loaded.run(input);
    assertEquals(done.usage.evidence, { CREDIT: 6 });
    assertEquals(done.usage.credits, { default: 6 });
});

Deno.test("all rows failed bills 0 and still returns status", async () => {
    const input = {
        body: {
            places: [
                {
                    id: "nowhere-1",
                    poi_name: "Tartine Bakery",
                    latitude: 0,
                    longitude: 0,
                },
                {
                    id: "nowhere-2",
                    poi_name: "Philz Coffee",
                    latitude: 0,
                    longitude: 0,
                },
            ],
            attributes: ["phone"],
        },
    };
    const result = await h.run("all-rows-failed", input);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    const out = result.output as {
        status: string;
        progress: Json;
        results: { files: Json[] };
    };
    assertEquals(out.status, "completed");
    assertEquals(out.progress, { processed: 2, succeeded: 0, failed: 2 });
    // the failed rows are in the file, with their errors
    assertEquals(out.results.files.length, 1);
});

Deno.test("the estimate is places × row cost", async () => {
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
    const pricier = { body: { places: PLACES, ...PRICIER } };
    assertEquals(loaded.estimate(pricier).credits, { default: 9 });
    const one = { body: { places: [PLACES[0]], ...PRICIER } };
    assertEquals(loaded.estimate(one).credits, { default: 3 });
});

Deno.test("stop bills the rows that succeeded before the cancel at the row's price", async () => {
    const input = { body: { places: PLACES, ...PRICIER } };
    const { loaded } = await wireJob(() =>
        Response.json(job("cancelled", 1, 0))
    );
    const stopped = await loaded.stop(input, await startedState(input), RUN);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(stopped.usage.credits, { default: 3 });
});

Deno.test("submit 422 settles 0", async () => {
    // live, VOYGR refuses a bad row with 400 before any job exists
    const typo = {
        body: { places: [PLACES[1]], attributes: ["openning_hours"] },
    };
    const result = await h.run("submit-typo-400", typo);
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, ZERO);
    assertEquals(result.timing.attempts, 0);
    assertEquals(
        result.output,
        (await h.fixture("submit-typo-400")).calls[0].res.body,
    );
    // and any other refusal the same way
    for (
        const [status, body] of [
            [422, { detail: [{ msg: "Field required" }] }],
            [402, { error_code: "INSUFFICIENT_CREDITS" }],
        ] as [number, Json][]
    ) {
        const { loaded, sent } = await h.wire(status, body);
        const refused = await loaded.run(INPUT);
        assertEquals(refused.httpStatus, status);
        assertEquals(refused.output, body);
        assertEquals(refused.usage, ZERO);
        assertEquals(sent.length, 1);
    }
});

// ---------------------------------------------------------------------------
// the wire, fail closed, binding
// ---------------------------------------------------------------------------

Deno.test("every request of the run carries X-Sub-Account, and the submit the Idempotency-Key", async () => {
    let reads = 0;
    const { loaded, sent } = await wireJob(() =>
        Response.json(
            reads++ === 0 ? job("running", 0, 0) : job("cancelled", 1, 0),
        )
    );
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    const polled = await loaded.poll(INPUT, started.state, RUN);
    assert(polled.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(INPUT, polled.state, RUN);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(sent.map((s) => [s.method, s.url]), [
        ["POST", `${BASE}/v1/jobs/enrich`],
        ["GET", JOB_URL],
        ["DELETE", JOB_URL],
        ["GET", JOB_URL],
    ]);
    for (const s of sent) {
        assertEquals(s.headers.get("x-sub-account"), SUB_ID, s.url);
        assertEquals(s.headers.get("x-api-key"), "test-key", s.url);
    }
    assertEquals(sent[0].headers.get("idempotency-key"), "run-1:job");
});

Deno.test("enrich-batch declares the sub-account binding", () =>
    h.assertBinding());

Deno.test("enrich-batch fails closed without a sub-account, with no request at all", () =>
    h.assertFailsClosed(INPUT));

Deno.test("enrich-batch poll and stop fail closed without a sub-account", async () => {
    const state = await startedState(INPUT);
    const { loaded, sent } = await h.wire(200, job("completed", 3, 0), []);
    for (
        const tick of [
            await loaded.poll(INPUT, state, RUN),
            await loaded.stop(INPUT, state, RUN),
        ]
    ) {
        assert(tick.kind === RunKind.COMPLETED);
        assertEquals(tick.httpStatus, 503);
        assertEquals(
            (tick.output as { code: string }).code,
            "SUB_ACCOUNT_UNAVAILABLE",
        );
        assertEquals(tick.usage, ZERO);
    }
    assertEquals(sent, []);
});

// ---------------------------------------------------------------------------
// schema
// ---------------------------------------------------------------------------

Deno.test("enrich-batch schema: places carry no options, and options are shared", async () => {
    const place = PLACES[0];
    const rejected: [string, Json][] = [
        ["no places", { attributes: ["phone"] }],
        ["an empty list", { places: [] }],
        ["10,001 places", {
            places: Array.from({ length: 10_001 }, () => place),
        }],
        ["a place without a name", { places: [{ address: place.address }] }],
        ["attributes inside a place", {
            places: [{ ...place, attributes: ["phone"] }],
        }],
        ["a check inside a place", {
            places: [{ ...place, verify_name: true }],
        }],
        ["the job's own pois list", { pois: [place] }],
        ["max_credits", { places: [place], max_credits: 5 }],
        ["estimate_only", { places: [place], estimate_only: true }],
        ["response_format", { places: [place], response_format: "cell" }],
        ["an empty attributes list", { places: [place], attributes: [] }],
        ["21 attributes", {
            places: [place],
            attributes: Array.from({ length: 21 }, (_, i) => "f" + i),
        }],
        ["an unknown contact", {
            places: [place],
            attributes: [{ name: "owners", include: ["fax"] }],
        }],
    ];
    for (const [shape, body] of rejected) {
        await rejectsInput({ body: body as Record<string, Json> }, shape);
    }
    await rejectsInput({}, "no body");

    const unit = await testSealedUnit(ID);
    const accepted: Record<string, Json>[] = [
        INPUT.body as Record<string, Json>,
        { places: PLACES },
        { places: PLACES, ...PRICIER, include_summary: true },
        { places: Array.from({ length: 10_000 }, () => place) },
    ];
    for (const body of accepted) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture: await h.fixture("happy"),
            resources: [OWNED],
        });
    }
});
