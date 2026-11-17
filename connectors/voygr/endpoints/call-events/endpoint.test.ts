import { assert, assertEquals, assertRejects } from "@std/assert";
import { type Json, type RunInput } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { harness, OWNED, SUB_ID } from "../../test-support.ts";

/**
 * `voygr#call-events`. SYNTHETIC: a real call holds a real callee and
 * transcript, so the fixtures are shaped from the public OpenAPI (the
 * CallDTO and the event stream's SSE text). The ids and the phone numbers
 * (555-01xx) are made up.
 *
 * The endpoint reads one call first (`GET /calls/{call_id}`) and opens the
 * events only once the call has an outcome: through Monid a running call's
 * stream never ends. So each test says which requests went out.
 */

const ID = "voygr#call-events";
const h = harness(ID, import.meta.url);

const LIVE = "Read voygr#get-call for pending_questions while the call " +
    "runs; events are available once it ends.";

const SSE = "id: 7\nevent: status_change\n" +
    'data: {"event_id": 7, "call_id": "c_synthetic01", "event_type": "status_change", "data": {"status": "dialing"}}\n\n';

const BASE = "https://api.voygr.tech";

/** A call as the probe reads it: only `outcome_type` and `result` matter
 *  here. */
const call = (outcomeType: Json) => ({
    call_id: "c_synthetic01",
    status: "completed",
    outcome_type: outcomeType,
});

/** The probe answers `probe` (status and body), the events answer `SSE`. */
function wireCall(
    probe: { status: number; body: Json },
    events: { status: number; body: string } = { status: 200, body: SSE },
) {
    return h.wireWith((url) =>
        url.includes("/events")
            ? new Response(events.body, {
                status: events.status,
                headers: { "content-type": "text/event-stream" },
            })
            : Response.json(probe.body, { status: probe.status })
    );
}

Deno.test("live call answers CALL_STILL_RUNNING without opening the stream", async () => {
    // the fixture holds only the probe: a second request has nothing to match
    const result = await h.run("synthetic-live-call", {
        pathParams: { call_id: "c_synthetic02" },
        queryParams: { after_event_id: 0 },
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { code: "CALL_STILL_RUNNING", message: LIVE });
});

Deno.test("finished call returns its event history", async () => {
    const result = await h.run("synthetic-finished-call", {
        pathParams: { call_id: "c_synthetic01" },
        queryParams: { after_event_id: 0 },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the SSE text, as VOYGR sends it
    const events = (await h.fixture("synthetic-finished-call")).calls[1].res
        .body;
    assertEquals(result.output, events);
    const text = result.output as string;
    assert(text.startsWith("id: 2001\nevent: status_change\n"));
    assertEquals(text.match(/^event: /gm)?.length, 3);
    assert(text.includes('"outcome_type": "success_no_booking"'));
});

Deno.test("foreign call 404 settles zero and opens no stream", async () => {
    const result = await h.run("synthetic-foreign-call-404", {
        pathParams: { call_id: "c_synthetic99" },
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Call not found" });
});

Deno.test("call-events asks about the call first, then reads the events, both as this workspace", async () => {
    const { loaded, sent } = await wireCall({
        status: 200,
        body: call("success_no_booking"),
    });
    const result = await loaded.run({
        pathParams: { call_id: "c_synthetic01" },
        queryParams: { after_event_id: 5 },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, SSE);
    assertEquals(sent.map((s) => [s.method, s.url]), [
        ["GET", `${BASE}/calls/c_synthetic01`],
        ["GET", `${BASE}/calls/c_synthetic01/events?after_event_id=5`],
    ]);
    for (const s of sent) {
        assertEquals(s.headers.get("x-api-key"), "test-key");
        assertEquals(s.headers.get("x-sub-account"), SUB_ID);
        assertEquals(s.body, undefined);
    }
});

Deno.test("call-events without a cursor sends no query", async () => {
    const { loaded, sent } = await wireCall({
        status: 200,
        body: call("success_no_booking"),
    });
    await loaded.run({ pathParams: { call_id: "c_synthetic01" } });
    assertEquals(sent[1].url, `${BASE}/calls/c_synthetic01/events`);
});

Deno.test("call-events encodes the call id into one path segment, in both requests", async () => {
    const { loaded, sent } = await wireCall({
        status: 200,
        body: call("success_no_booking"),
    });
    await loaded.run({ pathParams: { call_id: "a/b?c" } });
    assertEquals(sent.map((s) => s.url), [
        `${BASE}/calls/a%2Fb%3Fc`,
        `${BASE}/calls/a%2Fb%3Fc/events`,
    ]);
});

Deno.test("a running call asks once, with the sub-account, and never opens the events", async () => {
    const { loaded, sent } = await wireCall({
        status: 200,
        body: call(null),
    });
    const result = await loaded.run({
        pathParams: { call_id: "c_synthetic01" },
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(sent.length, 1);
    assertEquals(sent[0].url, `${BASE}/calls/c_synthetic01`);
    assertEquals(sent[0].headers.get("x-sub-account"), SUB_ID);
    assertEquals(sent[0].headers.get("x-api-key"), "test-key");
});

Deno.test("a call with a result and no outcome_type opens the stream", async () => {
    // `result` is the field VOYGR keeps; `outcome_type` is deprecated
    for (
        const body of [
            {
                call_id: "c_synthetic01",
                status: "completed",
                result: "aborted",
            },
            { ...call(null), result: "goal_met" },
        ]
    ) {
        const { loaded, sent } = await wireCall({ status: 200, body });
        const result = await loaded.run({
            pathParams: { call_id: "c_synthetic01" },
        });
        assertEquals(result.httpStatus, 200, JSON.stringify(body));
        assertEquals(result.output, SSE);
        assertEquals(sent.length, 2);
    }
});

Deno.test("only an outcome_type or a result opens the stream", async () => {
    const unfinished: [string, Json][] = [
        ["outcome_type and result null", { ...call(null), result: null }],
        ["outcome_type null, result missing", call(null)],
        ["both missing", { call_id: "c_synthetic01" }],
        ["a body that is not a call", "not a call"],
        ["an empty body", null],
    ];
    for (const [shape, body] of unfinished) {
        const { loaded, sent } = await wireCall({ status: 200, body });
        const result = await loaded.run({
            pathParams: { call_id: "c_synthetic01" },
        });
        assertEquals(result.httpStatus, 409, shape);
        assertEquals(sent.length, 1, shape);
    }
});

Deno.test("a probe refusal comes back as it was, and opens no stream", async () => {
    for (
        const [status, body] of [
            [403, { detail: { error_code: "SUB_ACCOUNT_SUSPENDED" } }],
            [404, { detail: { error_code: "SUB_ACCOUNT_NOT_FOUND" } }],
            [503, {
                detail: { error_code: "SUB_ACCOUNT_BACKEND_UNAVAILABLE" },
            }],
        ] as [number, Json][]
    ) {
        const { loaded, sent } = await wireCall({ status, body });
        const result = await loaded.run({
            pathParams: { call_id: "c_synthetic01" },
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.output, body);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(sent.length, 1);
    }
});

Deno.test("an events refusal comes back as it was", async () => {
    const { loaded, sent } = await wireCall(
        { status: 200, body: call("success_no_booking") },
        { status: 404, body: JSON.stringify({ detail: "Call not found" }) },
    );
    const result = await loaded.run({
        pathParams: { call_id: "c_synthetic01" },
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.output, { detail: "Call not found" });
    assertEquals(sent.length, 2);
});

Deno.test("a finished call with no newer events answers an empty text", async () => {
    const { loaded } = await wireCall(
        { status: 200, body: call("success_no_booking") },
        { status: 200, body: "" },
    );
    const result = await loaded.run({
        pathParams: { call_id: "c_synthetic01" },
        queryParams: { after_event_id: 2003 },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, "");
});

Deno.test("call-events schema: call_id is required and the cursor is a non-negative integer", async () => {
    const unit = await testSealedUnit(ID);
    const rejected: [string, RunInput][] = [
        ["no path params", {}],
        ["no call_id", { pathParams: {} }],
        ["empty call_id", { pathParams: { call_id: "" } }],
        ["a typo'd path key", { pathParams: { callid: "c_1" } }],
        [
            "cursor -1",
            {
                pathParams: { call_id: "c_1" },
                queryParams: { after_event_id: -1 },
            },
        ],
        [
            "cursor 1.5",
            {
                pathParams: { call_id: "c_1" },
                queryParams: { after_event_id: 1.5 },
            },
        ],
        [
            "cursor as text",
            {
                pathParams: { call_id: "c_1" },
                queryParams: { after_event_id: "5" },
            },
        ],
        [
            "a typo'd query key",
            { pathParams: { call_id: "c_1" }, queryParams: { after: 5 } },
        ],
    ];
    for (const [shape, input] of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input,
                    mode: "replay",
                    resources: [OWNED],
                }),
            Error,
            "INVALID_INPUT",
            shape,
        );
    }
    const accepted: RunInput[] = [
        { pathParams: { call_id: "c_synthetic01" } },
        { pathParams: { call_id: "c_synthetic01" }, queryParams: {} },
        {
            pathParams: { call_id: "c_synthetic01" },
            queryParams: { after_event_id: 0 },
        },
    ];
    for (const input of accepted) {
        await assertInputAccepted({
            unit,
            input,
            mode: "replay",
            fixture: await h.fixture("synthetic-finished-call"),
            resources: [OWNED],
        });
    }
});

Deno.test("call-events declares the sub-account binding", () =>
    h.assertBinding());

Deno.test("call-events fails closed without a sub-account, with no request at all", () =>
    h.assertFailsClosed({ pathParams: { call_id: "c_synthetic01" } }));

Deno.test({
    name: "voygr#call-events live: an unknown call_id is a 404 at zero",
    ignore: liveSkip("voygr"),
    fn: async () => {
        // the probe read of the call answers 404, so no stream is opened
        const result = await h.live({
            pathParams: { call_id: "c_00000000000000000000000000000000" },
        });
        assertEquals(result.httpStatus, 404, JSON.stringify(result));
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
