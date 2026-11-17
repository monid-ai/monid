// No live test: a live run would dial a real business.
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
import { TERMS_TEXT, TERMS_VERSION } from "./schema/inputs.ts";

/**
 * `voygr#place-call`: the run is the call. SYNTHETIC: a real call rings a
 * real business and bills real credits, so the fixtures are shaped from
 * the public OpenAPI (the POST /calls answers and the CallDTO). The ids
 * and the phone numbers (555-01xx) are made up.
 *
 * The run starts with `POST /calls`, polls `GET /calls/{call_id}` until
 * the call has ended AND its outcome has landed, and bills 10 credits
 * when `outcome_charge_cents` is above 0. Stopping the run cancels the
 * call and settles from the final record.
 */

const ID = "voygr#place-call";
const h = harness(ID, import.meta.url);
const BASE = "https://api.voygr.tech";
const RUN = { runId: "run-1" };
const ZERO = { credits: {}, evidence: {} };

const BODY = {
    accept_terms: TERMS_TEXT,
    target_phone: "+14155550102",
    brief: "Ask what time the kitchen closes tonight.",
};
const INPUT: RunInput = { body: BODY };

/** What VOYGR is sent: the body without `accept_terms`. */
const { accept_terms: _terms, ...SENT_BODY } = BODY;

const NOT_ARRIVED = "The call ended, but its outcome had not arrived a " +
    "minute later. This run is not charged. Read the call with " +
    "voygr#get-call for its outcome.";

const QUEUED = {
    call_id: "c_synthetic21",
    position: 0,
    status: "queued",
    credits_reserved: 0,
    credits_charge_on_success: 10,
};

/** A call as a read returns it: only these fields matter to the run. */
const call = (status: string, outcome: Json, charge: number) => ({
    call_id: "c_synthetic21",
    customer_id: "cus_synthetic-0001",
    status,
    outcome_type: outcome,
    outcome_charge_cents: charge,
    recording_url: null,
});

/** Answers each request in turn from `script`, recording the wire. */
function wireScript(script: [number, Json][]) {
    let next = 0;
    return h.wireWith(() => {
        const [status, body] = script[Math.min(next++, script.length - 1)];
        return Response.json(body, { status });
    });
}

/** Replay `name` with the phases driven by the test. */
async function load(name: string) {
    return await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await h.fixture(name),
        resources: [OWNED],
        scopeKey: "ws-1",
    });
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
// accept_terms and the input gate
// ---------------------------------------------------------------------------

Deno.test("missing accept_terms is INVALID_INPUT with no upstream call", async () => {
    const { loaded, sent } = await h.wire(202, QUEUED);
    await assertRejects(
        () => loaded.run({ body: SENT_BODY }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(sent, []);
});

Deno.test("wrong accept_terms text is INVALID_INPUT", async () => {
    // any other date: still a mismatch after the next terms bump
    const otherVersion = TERMS_TEXT.replace(/\d{4}-\d{2}-\d{2}/, "1999-01-01");
    assert(otherVersion !== TERMS_TEXT);
    const wrong: [string, Json][] = [
        ["another version", otherVersion],
        [
            "the previous version",
            "I agree to the PlaceCall API Terms and " +
            "Privacy Policy (version 2026-09-24)",
        ],
        ["lower case", TERMS_TEXT.toLowerCase()],
        ["trailing space", TERMS_TEXT + " "],
        ["empty", ""],
        ["true", true],
        ["null", null],
    ];
    for (const [shape, terms] of wrong) {
        await rejectsInput(
            { body: { ...BODY, accept_terms: terms } },
            shape,
        );
    }
});

Deno.test("accept_terms is the published text, and its version names the client", async () => {
    assertEquals(
        TERMS_TEXT,
        "I agree to the PlaceCall API Terms and Privacy Policy " +
            "(version 2026-10-23)",
    );
    assertEquals(TERMS_VERSION, "20261023");
    const { loaded, sent } = await h.wire(202, QUEUED);
    await loaded.start(INPUT, RUN);
    assertEquals(
        sent[0].headers.get("x-client-agent"),
        "monid:t" + TERMS_VERSION,
    );
});

Deno.test("ask_user_mode webhook is INVALID_INPUT", async () => {
    await rejectsInput(
        { body: { ...BODY, ask_user_mode: "webhook" } },
        "webhook",
    );
    const unit = await testSealedUnit(ID);
    for (const mode of ["any", "stream"]) {
        await assertInputAccepted({
            unit,
            input: { body: { ...BODY, ask_user_mode: mode } },
            mode: "replay",
            fixture: await h.fixture("synthetic-call-202-completed"),
            resources: [OWNED],
        });
    }
});

Deno.test("place-call schema refuses what VOYGR would refuse as malformed", async () => {
    const rejected: [string, Json][] = [
        ["an unknown key", { ...BODY, callback: "+14155550103" }],
        ["disclosure true", { ...BODY, disclosure: true }],
        ["an unknown disclosure key", {
            ...BODY,
            disclosure: { company_name: "Acme", tone: "warm" },
        }],
        ["a company_name over 60", {
            ...BODY,
            disclosure: { company_name: "x".repeat(61) },
        }],
        ["a brief over 4000", { ...BODY, brief: "x".repeat(4001) }],
        ["an unknown language", { ...BODY, language: "xx" }],
        ["an unknown intent", { ...BODY, intent: "chat" }],
        ["slots as a list", { ...BODY, slots: ["question"] }],
        ["an unknown voice key", { ...BODY, voice: { accent: "uk" } }],
        ["a voice gender outside the list", {
            ...BODY,
            voice: { gender: "robot" },
        }],
        ["a suggestion_id under 4", { ...BODY, suggestion_id: "s_1" }],
        ["record_call as text", { ...BODY, record_call: "false" }],
        ["no body", null],
    ];
    for (const [shape, body] of rejected) {
        await rejectsInput(
            body === null ? {} : { body: body as Record<string, Json> },
            shape,
        );
    }
});

Deno.test("place-call schema accepts freeform, structured and every documented option", async () => {
    const unit = await testSealedUnit(ID);
    const accepted: Record<string, Json>[] = [
        BODY,
        {
            accept_terms: TERMS_TEXT,
            intent: "inquiry",
            slots: {
                intent: "inquiry",
                target_phone: "+14155550102",
                question: "What time does the kitchen close tonight?",
            },
        },
        {
            ...BODY,
            language: "es",
            kind: "restaurant_booking",
            disclosure: {
                company_name: "Acme Health",
                on_behalf_of: "Example Insurance",
                purpose: "to verify your practice's directory information",
                mention_ai: true,
                mention_recording: null,
            },
            record_call: true,
            voice: { gender: "female" },
            suggestion_id: "sg_synthetic01",
        },
        {
            ...BODY,
            brief: null,
            intent: null,
            slots: null,
            disclosure: null,
            record_call: null,
            voice: null,
            suggestion_id: null,
        },
    ];
    for (const body of accepted) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture: await h.fixture("synthetic-call-202-completed"),
            resources: [OWNED],
        });
    }
});

Deno.test("the disclosure text matches VOYGR's opening notice", async () => {
    // the public OpenAPI's DisclosureBody and CallCreateRequest.disclosure
    const text = JSON.stringify((await testSealedUnit(ID)).doc);
    for (
        const quoted of [
            "Hi, this is PlaceCall's AI assistant, calling for a client on " +
            "a recorded line.",
            "calling for {on_behalf_of}",
            "{company_name}'s AI assistant",
            "Default true; `false` drops it.",
            "on a recorded line",
            "Ends the sentence",
        ]
    ) {
        assert(text.includes(JSON.stringify(quoted).slice(1, -1)), quoted);
    }
    for (
        const stale of [
            "recorded for notes",
            "digital assistant",
            "Default false",
        ]
    ) {
        assert(!text.includes(stale), stale);
    }
});

// ---------------------------------------------------------------------------
// the run: start, poll, bill
// ---------------------------------------------------------------------------

Deno.test("201 then completed with charge 10 bills 10", async () => {
    const result = await h.run("synthetic-call-201-completed", INPUT);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.evidence, { RESULT: 1 });
    assertEquals(result.usage.credits, { default: 10 });
    // the in_progress read, then the finished one
    assertEquals(result.timing.attempts, 2);
    const out = result.output as Record<string, Json>;
    assertEquals(out.call_id, "c_synthetic11");
    assertEquals(out.status, "completed");
    assertEquals(out.outcome_type, "success_no_booking");
    assertEquals(out.outcome_charge_cents, 10);
    // the provider projection holds on the run's output too
    assertEquals("customer_id" in out, false);
    assertEquals("recording_url" in out, false);
    assertEquals(out.has_recording, true);
    // the run ends with the outcome; the transcript can still be live
    assertEquals(out.transcript_status, "live");
});

Deno.test("202 queued then completed bills 10", async () => {
    const result = await h.run("synthetic-call-202-completed", INPUT);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.evidence, { RESULT: 1 });
    assertEquals(result.usage.credits, { default: 10 });
    assertEquals(result.timing.attempts, 2);
    assertEquals(
        (result.output as { call_id: string }).call_id,
        "c_synthetic12",
    );
});

Deno.test("terminal without outcome keeps RUNNING, next poll bills 10", async () => {
    const loaded = await load("synthetic-call-late-outcome");
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    assertEquals(started.state.externalRunId, "c_synthetic13");
    assertEquals(started.pollAfterMs, 5000);

    const late = await loaded.poll(INPUT, started.state, RUN);
    assert(late.kind === RunKind.RUNNING, "an ended call without outcome");
    assertEquals(late.state.externalRunId, "c_synthetic13");
    assertEquals(late.state.data, { late: 1 });

    const done = await loaded.poll(INPUT, late.state, RUN);
    assert(done.kind === RunKind.COMPLETED);
    assertEquals(done.httpStatus, 200);
    assertEquals(done.usage.evidence, { RESULT: 1 });
    assertEquals(done.usage.credits, { default: 10 });
});

Deno.test("outcome never lands settles 0", async () => {
    // 10 is not a shape VOYGR sends without an outcome; it shows the
    // charge is forced to 0, not read
    for (const charge of [0, 10]) {
        const { loaded, sent } = await h.wireWith((_url, method) =>
            method === "POST"
                ? Response.json(QUEUED, { status: 202 })
                : Response.json(call("completed", null, charge))
        );
        const result = await loaded.run(INPUT);
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage.evidence, { RESULT: 0 });
        assertEquals(result.usage.credits, {});
        // twelve late reads, one minute at 5 s
        assertEquals(result.timing.attempts, 12);
        assertEquals(sent.length, 13);
        const out = result.output as Record<string, Json>;
        assertEquals(out.outcome_charge_cents, 0);
        assertEquals(out.notes, NOT_ARRIVED);
        assertEquals(out.status, "completed");
        assertEquals("customer_id" in out, false);
    }
});

Deno.test("an outcome that lands on the twelfth late read still bills", async () => {
    let reads = 0;
    const { loaded } = await h.wireWith((_url, method) => {
        if (method === "POST") return Response.json(QUEUED, { status: 202 });
        reads++;
        return Response.json(
            reads < 12
                ? call("completed", null, 0)
                : call("completed", "success_no_booking", 10),
        );
    });
    const result = await loaded.run(INPUT);
    assertEquals(result.usage.credits, { default: 10 });
    assertEquals(result.timing.attempts, 12);
    assertEquals((result.output as Record<string, Json>).notes, undefined);
});

Deno.test("voicemail completes with 0", async () => {
    const result = await h.run("synthetic-call-voicemail", INPUT);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.evidence, { RESULT: 0 });
    assertEquals(result.usage.credits, {});
    const out = result.output as Record<string, Json>;
    assertEquals(out.outcome_type, "failed_voicemail");
    assertEquals(out.line_kind, "voicemail");
});

Deno.test("every terminal status ends the run once the outcome is in", async () => {
    for (const status of ["completed", "failed", "cancelled"]) {
        const { loaded } = await h.wire(
            200,
            call(status, "failed_technical", 0),
        );
        const state = await startedState();
        const done = await loaded.poll(INPUT, state, RUN);
        assert(done.kind === RunKind.COMPLETED, status);
        assertEquals(done.usage.credits, {}, status);
    }
    for (const status of ["queued", "dialing", "in_progress"]) {
        const { loaded } = await h.wire(200, call(status, null, 0));
        const running = await loaded.poll(INPUT, await startedState(), RUN);
        assert(running.kind === RunKind.RUNNING, status);
        assertEquals(running.state.externalRunId, "c_synthetic21", status);
    }
});

/** A finished call whose `outcome_type` is absent but whose `result` is
 *  set: `result` is the field VOYGR keeps, `outcome_type` is deprecated. */
const RESULT_ONLY = {
    call_id: "c_synthetic21",
    status: "completed",
    result: "goal_met",
    outcome_charge_cents: 10,
};

Deno.test("a terminal call with a result and no outcome_type completes and bills", async () => {
    for (const body of [RESULT_ONLY, { ...RESULT_ONLY, outcome_type: null }]) {
        const { loaded } = await h.wire(200, body);
        const done = await loaded.poll(INPUT, await startedState(), RUN);
        assert(done.kind === RunKind.COMPLETED, JSON.stringify(body));
        assertEquals(done.httpStatus, 200);
        assertEquals(done.usage.credits, { default: 10 });
        assertEquals((done.output as Record<string, Json>).notes, undefined);
    }
});

Deno.test("stop settles at once from a record with a result and no outcome_type", async () => {
    const { loaded, sent, slept } = await h.wireWith((url, method) => {
        if (url.endsWith("/cancel")) return Response.json({ cancelled: false });
        if (method === "POST") return Response.json(QUEUED, { status: 202 });
        return Response.json(RESULT_ONLY);
    });
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(INPUT, started.state, RUN);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(stopped.usage.credits, { default: 10 });
    // the POST, the cancel and one read
    assertEquals(sent.length, 3);
    assertEquals(slept, []);
});

/** A run state as `start` leaves it (a 202 for c_synthetic21). */
async function startedState(): Promise<RunState> {
    const { loaded } = await h.wire(202, QUEUED);
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    return started.state;
}

// ---------------------------------------------------------------------------
// refusals and retries at start
// ---------------------------------------------------------------------------

Deno.test("422 refusal settles 0 and passes through", async () => {
    const result = await h.run("synthetic-call-422-refused", INPUT);
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, ZERO);
    assertEquals(result.timing.attempts, 0);
    assertEquals(
        result.output,
        await h.recorded("synthetic-call-422-refused"),
    );
});

Deno.test("402 settles 0", async () => {
    const result = await h.run("synthetic-call-402", INPUT);
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, ZERO);
    assertEquals(result.output, await h.recorded("synthetic-call-402"));
});

Deno.test("502 retried once with the same Idempotency-Key", async () => {
    const { loaded, sent } = await wireScript([
        [502, { error: "backend error", error_code: "BACKEND_ERROR" }],
        [202, QUEUED],
    ]);
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    assertEquals(started.state.externalRunId, "c_synthetic21");
    assertEquals(sent.length, 2);
    for (const s of sent) {
        assertEquals([s.method, s.url], ["POST", `${BASE}/calls`]);
        assertEquals(s.headers.get("idempotency-key"), "run-1:call");
        assertEquals(JSON.parse(s.body!), SENT_BODY);
    }
});

Deno.test("a second 502 settles as data after exactly two attempts", async () => {
    const backend = { error: "backend error", error_code: "BACKEND_ERROR" };
    const { loaded, sent } = await wireScript([[502, backend]]);
    const result = await loaded.start(INPUT, RUN);
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 502);
    assertEquals(result.isProviderError, true);
    assertEquals(result.output, backend);
    assertEquals(result.usage, ZERO);
    assertEquals(sent.length, 2);
});

Deno.test("409 idempotency_state_unknown is not retried and comes back as data", async () => {
    const unknown = {
        detail: {
            error: "idempotency_state_unknown",
            message: "List recent calls to find out.",
        },
    };
    const { loaded, sent } = await wireScript([[409, unknown], [202, QUEUED]]);
    const result = await loaded.start(INPUT, RUN);
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.output, unknown);
    assertEquals(result.usage, ZERO);
    assertEquals(sent.length, 1);
});

/** VOYGR's 409 for a key whose first request is still being handled. */
const busy = (after?: number) => ({
    detail: {
        error: "idempotency_in_progress",
        ...(after === undefined ? {} : { retry_after_seconds: after }),
    },
});

/** Each request went out with the same key and the same body. */
function assertSameRequest(sent: { headers: Headers; body?: string }[]) {
    for (const s of sent) {
        assertEquals(s.headers.get("idempotency-key"), "run-1:call");
        assertEquals(JSON.parse(s.body!), SENT_BODY);
    }
}

Deno.test("409 idempotency_in_progress is retried with the same key after retry_after_seconds", async () => {
    // the wait: as asked, capped at 30 s, 5 s when absent
    for (
        const [after, wait] of [[2, 2000], [45, 30000], [undefined, 5000]] as [
            number | undefined,
            number,
        ][]
    ) {
        const { loaded, sent, slept } = await wireScript([
            [409, busy(after)],
            [202, QUEUED],
        ]);
        const started = await loaded.start(INPUT, RUN);
        assert(started.kind === RunKind.RUNNING, String(after));
        assertEquals(started.state.externalRunId, "c_synthetic21");
        assertEquals(slept, [wait]);
        assertEquals(sent.length, 2);
        assertSameRequest(sent);
    }
});

Deno.test("409 idempotency_in_progress three times, then a 202, starts the run", async () => {
    const { loaded, sent, slept } = await wireScript([
        [409, busy(1)],
        [409, busy(2)],
        [409, busy(3)],
        [202, QUEUED],
    ]);
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    assertEquals(started.state.externalRunId, "c_synthetic21");
    assertEquals(slept, [1000, 2000, 3000]);
    assertEquals(sent.length, 4);
    assertSameRequest(sent);
});

Deno.test("409 idempotency_in_progress after three retries comes back as data", async () => {
    const { loaded, sent, slept } = await wireScript([[409, busy(1)]]);
    const result = await loaded.start(INPUT, RUN);
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.output, busy(1));
    assertEquals(result.usage, ZERO);
    // the first request and three retries, each after its wait
    assertEquals(sent.length, 4);
    assertEquals(slept, [1000, 1000, 1000]);
    assertSameRequest(sent);
});

Deno.test("502, then idempotency_in_progress on the retry, then 201 starts the run", async () => {
    const { loaded, sent, slept } = await wireScript([
        [502, { error_code: "BACKEND_ERROR" }],
        [409, busy(2)],
        [201, { call: { call_id: "c_synthetic22", status: "dialing" } }],
    ]);
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    assertEquals(started.state.externalRunId, "c_synthetic22");
    // the 502 is retried at once; the 409 after its wait
    assertEquals(slept, [2000]);
    assertEquals(sent.length, 3);
    assertSameRequest(sent);
});

Deno.test("the start's waits stay inside the engine's 120 s phase budget", async () => {
    // the longest start there is: a 502, then four 409s asking for 999 s
    const { loaded, sent, slept } = await wireScript([
        [502, { error_code: "BACKEND_ERROR" }],
        [409, busy(999)],
    ]);
    const result = await loaded.start(INPUT, RUN);
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 409);
    assertEquals(result.usage, ZERO);
    assertEquals(sent.length, 5);
    assertEquals(slept, [30000, 30000, 30000]);
    assert(slept.reduce((a, b) => a + b, 0) <= 120_000);
});

Deno.test("a 502 is retried at once, without a wait", async () => {
    const { loaded, slept } = await wireScript([
        [502, { error_code: "BACKEND_ERROR" }],
        [202, QUEUED],
    ]);
    await loaded.start(INPUT, RUN);
    assertEquals(slept, []);
});

Deno.test("other refusals come back as data after one request", async () => {
    const refusals: [number, Json][] = [
        [409, { detail: { error: "idempotency_conflict" } }],
        [409, { detail: { error: "idempotency_state_unknown" } }],
        [400, { detail: { error: "idempotency_key_invalid" } }],
        [403, { detail: { error_code: "SUB_ACCOUNT_SUSPENDED" } }],
        [422, { detail: { error_code: "invalid_target_phone" } }],
        [429, { detail: { error: "daily_call_ceiling_reached" } }],
        [503, { detail: { error: "maintenance" } }],
        [500, { detail: "Internal Server Error" }],
    ];
    for (const [status, body] of refusals) {
        const { loaded, sent } = await wireScript([[status, body], [
            202,
            QUEUED,
        ]]);
        const result = await loaded.start(INPUT, RUN);
        assert(result.kind === RunKind.COMPLETED, String(status));
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.output, body);
        assertEquals(result.usage, ZERO);
        assertEquals(sent.length, 1, JSON.stringify(body));
    }
});

Deno.test("a 2xx without a call id is a 502 at zero", async () => {
    for (const body of [{ status: "queued" }, { call: {} }, null] as Json[]) {
        const { loaded } = await h.wire(202, body);
        const result = await loaded.start(INPUT, RUN);
        assert(result.kind === RunKind.COMPLETED);
        assertEquals(result.httpStatus, 502);
        assertEquals(result.providerHttpStatus, 202);
        assertEquals(result.usage, ZERO);
        // a call may have been dialled: the caller is told to look before
        // it sends the task again
        assertEquals(result.output, {
            code: "MALFORMED_CALL",
            message: "VOYGR accepted the call but returned no call id. " +
                "A call may have been placed: read voygr#list-calls before " +
                "you send it again.",
        });
    }
});

// ---------------------------------------------------------------------------
// the wire
// ---------------------------------------------------------------------------

Deno.test("request carries X-Client-Agent monid:t20261023, X-Sub-Account and the Idempotency-Key", async () => {
    const { loaded, sent } = await h.wire(202, QUEUED);
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    assertEquals(sent.length, 1);
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].url, `${BASE}/calls`);
    assertEquals(sent[0].headers.get("x-client-agent"), "monid:t20261023");
    assertEquals(sent[0].headers.get("x-sub-account"), SUB_ID);
    assertEquals(sent[0].headers.get("idempotency-key"), "run-1:call");
    assertEquals(sent[0].headers.get("x-api-key"), "test-key");
    // accept_terms is checked here and never sent
    assertEquals(JSON.parse(sent[0].body!), SENT_BODY);
});

Deno.test("disclosure false and record_call false pass through to the request body", async () => {
    const body = {
        ...BODY,
        language: "de",
        disclosure: false,
        record_call: false,
        ask_user_mode: "stream",
        voice: { gender: "male" },
    };
    const { loaded, sent } = await h.wire(202, QUEUED);
    await loaded.start({ body }, RUN);
    const { accept_terms: _, ...expected } = body;
    assertEquals(JSON.parse(sent[0].body!), expected);

    const object = {
        ...BODY,
        disclosure: { company_name: "Acme Health", mention_ai: true },
    };
    const second = await h.wire(202, QUEUED);
    await second.loaded.start({ body: object }, RUN);
    assertEquals(JSON.parse(second.sent[0].body!).disclosure, {
        company_name: "Acme Health",
        mention_ai: true,
    });
});

Deno.test("an accept_terms key inside slots is the caller's and is sent", async () => {
    const body = {
        accept_terms: TERMS_TEXT,
        intent: "inquiry",
        slots: { accept_terms: "yes", question: "Open today?" },
    };
    const { loaded, sent } = await h.wire(202, QUEUED);
    await loaded.start({ body }, RUN);
    assertEquals(JSON.parse(sent[0].body!), {
        intent: "inquiry",
        slots: { accept_terms: "yes", question: "Open today?" },
    });
});

Deno.test("every poll and stop request carries X-Sub-Account", async () => {
    let cancelled = false;
    const { loaded, sent } = await h.wireWith((url, method) => {
        if (url.endsWith("/cancel")) {
            cancelled = true;
            return Response.json({ cancelled: true });
        }
        if (method === "POST") return Response.json(QUEUED, { status: 202 });
        return Response.json(
            cancelled
                ? call("cancelled", "failed_cancelled", 0)
                : call("in_progress", null, 0),
        );
    });
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    const polled = await loaded.poll(INPUT, started.state, RUN);
    assert(polled.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(INPUT, polled.state, RUN);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(sent.map((s) => [s.method, s.url]), [
        ["POST", `${BASE}/calls`],
        ["GET", `${BASE}/calls/c_synthetic21`],
        ["POST", `${BASE}/calls/c_synthetic21/cancel`],
        ["GET", `${BASE}/calls/c_synthetic21`],
    ]);
    for (const s of sent) {
        assertEquals(s.headers.get("x-sub-account"), SUB_ID, s.url);
        assertEquals(s.headers.get("x-api-key"), "test-key", s.url);
    }
    // the reads and the cancel carry no body
    for (const s of sent.slice(1)) assertEquals(s.body, undefined, s.url);
});

Deno.test("the call id is encoded into one path segment", async () => {
    const odd = { ...QUEUED, call_id: "a/b?c" };
    const { loaded, sent } = await h.wireWith((url, method) =>
        method === "POST" && !url.endsWith("/cancel")
            ? Response.json(odd, { status: 202 })
            : url.endsWith("/cancel")
            ? Response.json({ cancelled: true })
            : Response.json(call("cancelled", "failed_cancelled", 0))
    );
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    await loaded.poll(INPUT, started.state, RUN);
    await loaded.stop(INPUT, started.state, RUN);
    assertEquals(sent.slice(1).map((s) => s.url), [
        `${BASE}/calls/a%2Fb%3Fc`,
        `${BASE}/calls/a%2Fb%3Fc/cancel`,
        `${BASE}/calls/a%2Fb%3Fc`,
    ]);
});

// ---------------------------------------------------------------------------
// poll edges
// ---------------------------------------------------------------------------

/** A wire whose every request fails the same way: `status`, or no
 *  answer at all (the fetch throws). A 429 carries `retryAfter`. */
function wireFailing(status: number | "throws", retryAfter?: string) {
    return h.wireWith(() => {
        if (status === "throws") throw new Error("connection reset");
        return Response.json({ detail: "busy" }, {
            status,
            headers: retryAfter === undefined
                ? {}
                : { "retry-after": retryAfter },
        });
    });
}

Deno.test("a poll that meets a server error or no answer keeps the run going and counts nothing", async () => {
    const state = await startedState();
    for (const status of [500, 502, 503, 504, "throws"] as const) {
        const { loaded, sent } = await wireFailing(status);
        const tick = await loaded.poll(INPUT, state, RUN);
        assert(tick.kind === RunKind.RUNNING, String(status));
        assertEquals(tick.state.externalRunId, "c_synthetic21");
        assertEquals(tick.state.data, undefined, String(status));
        assertEquals(tick.pollAfterMs, 5000, String(status));
        assertEquals(sent.length, 1);
    }
});

Deno.test("a poll that meets 429 waits for its Retry-After, at most 5 minutes", async () => {
    const state = await startedState();
    const cases: [string | undefined, number][] = [
        ["40", 40_000],
        ["900", 300_000],
        ["300", 300_000],
        // never sooner than the usual 5 s, nor without a usable header
        ["2", 5_000],
        [undefined, 5_000],
        ["0", 5_000],
        ["soon", 5_000],
        ["Wed, 21 Oct 2026 07:28:00 GMT", 5_000],
    ];
    for (const [retryAfter, wait] of cases) {
        const { loaded } = await wireFailing(429, retryAfter);
        const tick = await loaded.poll(INPUT, state, RUN);
        assert(tick.kind === RunKind.RUNNING, retryAfter);
        assertEquals(tick.pollAfterMs, wait, retryAfter);
        assertEquals(tick.state.externalRunId, "c_synthetic21");
        assertEquals(tick.state.data, undefined, retryAfter);
    }
});

Deno.test("reads that keep failing never end the run; the stop settles from the record", async () => {
    for (const status of [503, 429, "throws"] as const) {
        let cancelled = false;
        const { loaded, sent } = await h.wireWith((url, method) => {
            if (url.endsWith("/cancel")) {
                cancelled = true;
                return Response.json({ cancelled: true });
            }
            if (method === "POST") {
                return Response.json(QUEUED, { status: 202 });
            }
            if (!cancelled) {
                if (status === "throws") throw new Error("connection reset");
                return Response.json({ detail: "busy" }, { status });
            }
            return Response.json(call("cancelled", "failed_cancelled", 10));
        });
        const started = await loaded.start(INPUT, RUN);
        assert(started.kind === RunKind.RUNNING);
        let state = started.state;
        // well past the old give-up at 12
        for (let tick = 0; tick < 30; tick++) {
            const polled = await loaded.poll(INPUT, state, RUN);
            assert(polled.kind === RunKind.RUNNING, `${status} #${tick}`);
            state = polled.state;
        }
        // runMs ends the run with the engine's stop: cancel, then read
        const stopped = await loaded.stop(INPUT, state, RUN);
        assert(stopped.kind === RunKind.COMPLETED, String(status));
        assertEquals(stopped.usage.credits, { default: 10 });
        // the POST, 30 reads, the cancel and the read after it
        assertEquals(sent.length, 33);
    }
});

Deno.test("failures keep the late count, and a good read moves it on", async () => {
    const good = await h.wire(200, call("completed", null, 0));
    const late = await good.loaded.poll(INPUT, await startedState(), RUN);
    assert(late.kind === RunKind.RUNNING);
    assertEquals(late.state.data, { late: 1 });
    let state = late.state;
    for (const status of [503, 429, "throws"] as const) {
        const { loaded } = await wireFailing(status);
        const kept = await loaded.poll(INPUT, state, RUN);
        assert(kept.kind === RunKind.RUNNING);
        assertEquals(kept.state.data, { late: 1 }, String(status));
        state = kept.state;
    }
    const again = await good.loaded.poll(INPUT, state, RUN);
    assert(again.kind === RunKind.RUNNING);
    assertEquals(again.state.data, { late: 2 });

    // a good read of a call still running clears the count
    const running = await h.wire(200, call("in_progress", null, 0));
    const cleared = await running.loaded.poll(INPUT, again.state, RUN);
    assert(cleared.kind === RunKind.RUNNING);
    assertEquals(cleared.state.data, undefined);
    assertEquals(cleared.state.externalRunId, "c_synthetic21");
});

Deno.test("a poll without a call id in state fails without a request", async () => {
    const { externalRunId: _, ...noId } = await startedState();
    const { loaded, sent } = await h.wire(200, call("completed", null, 0));
    await assertRejects(
        () => loaded.poll(INPUT, noId, RUN),
        Error,
        "externalRunId",
    );
    assertEquals(sent, []);
});

Deno.test("a poll refusal that is not transient completes as data at zero", async () => {
    const { loaded } = await h.wire(404, { detail: "Call not found" });
    const tick = await loaded.poll(INPUT, await startedState(), RUN);
    assert(tick.kind === RunKind.COMPLETED);
    assertEquals(tick.httpStatus, 404);
    assertEquals(tick.isProviderError, true);
    assertEquals(tick.output, { detail: "Call not found" });
    assertEquals(tick.usage, ZERO);
});

// ---------------------------------------------------------------------------
// stop
// ---------------------------------------------------------------------------

Deno.test("stop cancels then settles from the final call (free under 30s, 10 after)", async () => {
    const cases: [string, Record<string, number>, Record<string, number>][] = [
        ["synthetic-call-stop-free", {}, { RESULT: 0 }],
        ["synthetic-call-stop-charged", { default: 10 }, { RESULT: 1 }],
    ];
    for (const [name, credits, evidence] of cases) {
        const loaded = await load(name);
        const started = await loaded.start(INPUT, RUN);
        assert(started.kind === RunKind.RUNNING, name);
        const stopped = await loaded.stop(INPUT, started.state, RUN);
        assert(stopped.kind === RunKind.COMPLETED, name);
        assertEquals(stopped.httpStatus, 200, name);
        assertEquals(stopped.usage.credits, credits, name);
        assertEquals(stopped.usage.evidence, evidence, name);
        const out = stopped.output as Record<string, Json>;
        assertEquals(out.status, "cancelled", name);
        assertEquals(out.outcome_type, "failed_cancelled", name);
        assertEquals("customer_id" in out, false, name);
    }
});

Deno.test("stop waits for the outcome of a call that had just ended", async () => {
    // the call ended on its own a moment before the stop: the cancel is
    // refused and the first read has no outcome yet
    let reads = 0;
    const { loaded, sent } = await h.wireWith((url, method) => {
        if (url.endsWith("/cancel")) return Response.json({ cancelled: false });
        if (method === "POST") return Response.json(QUEUED, { status: 202 });
        reads++;
        return Response.json(
            reads === 1
                ? call("completed", null, 0)
                : call("completed", "success_no_booking", 10),
        );
    });
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(INPUT, started.state, RUN);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(stopped.usage.credits, { default: 10 });
    assertEquals(sent.length, 4);
});

Deno.test("stop settles 0 with notes when the outcome never arrives", async () => {
    const { loaded, sent } = await h.wireWith((url, method) => {
        if (url.endsWith("/cancel")) return Response.json({ cancelled: false });
        if (method === "POST") return Response.json(QUEUED, { status: 202 });
        return Response.json(call("completed", null, 10));
    });
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(INPUT, started.state, RUN);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(stopped.usage.credits, {});
    assertEquals(stopped.usage.evidence, { RESULT: 0 });
    const out = stopped.output as Record<string, Json>;
    assertEquals(out.outcome_charge_cents, 0);
    assertEquals(out.notes, NOT_ARRIVED);
    // the POST, the cancel and twelve reads
    assertEquals(sent.length, 14);
});

Deno.test("a cancel that fails leaves the stop UNRESOLVED and reads nothing", async () => {
    for (const failure of [503, "throws"] as const) {
        const { loaded, sent } = await h.wireWith((url, method) => {
            if (url.endsWith("/cancel")) {
                if (failure === "throws") throw new Error("connection reset");
                return Response.json({ detail: "busy" }, { status: failure });
            }
            if (method === "POST") {
                return Response.json(QUEUED, { status: 202 });
            }
            return Response.json(call("in_progress", null, 0));
        });
        const started = await loaded.start(INPUT, RUN);
        assert(started.kind === RunKind.RUNNING);
        const stopped = await loaded.stop(INPUT, started.state, RUN);
        assert(stopped.kind === StopKind.UNRESOLVED, String(failure));
        assertEquals(stopped.state.externalRunId, "c_synthetic21");
        assertEquals(sent.length, 2);
    }
});

Deno.test("a call that cannot be read after the cancel leaves the stop UNRESOLVED", async () => {
    for (const failure of [503, 404, "throws"] as const) {
        const { loaded, sent } = await h.wireWith((url, method) => {
            if (url.endsWith("/cancel")) {
                return Response.json({ cancelled: true });
            }
            if (method === "POST") {
                return Response.json(QUEUED, { status: 202 });
            }
            if (failure === "throws") throw new Error("connection reset");
            return Response.json({ detail: "busy" }, { status: failure });
        });
        const started = await loaded.start(INPUT, RUN);
        assert(started.kind === RunKind.RUNNING);
        const stopped = await loaded.stop(INPUT, started.state, RUN);
        assert(stopped.kind === StopKind.UNRESOLVED, String(failure));
        assertEquals(stopped.state.externalRunId, "c_synthetic21");
        // the POST, the cancel and twelve reads
        assertEquals(sent.length, 14, String(failure));
    }
});

Deno.test("a failed read after the cancel is read again", async () => {
    let reads = 0;
    const { loaded } = await h.wireWith((url, method) => {
        if (url.endsWith("/cancel")) return Response.json({ cancelled: true });
        if (method === "POST") return Response.json(QUEUED, { status: 202 });
        reads++;
        return reads === 1
            ? Response.json({ detail: "busy" }, { status: 503 })
            : Response.json(call("cancelled", "failed_cancelled", 10));
    });
    const started = await loaded.start(INPUT, RUN);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(INPUT, started.state, RUN);
    assert(stopped.kind === RunKind.COMPLETED);
    assertEquals(stopped.usage.credits, { default: 10 });
});

Deno.test("stop without a call id is UNRESOLVED and sends nothing", async () => {
    const { externalRunId: _, ...noId } = await startedState();
    const { loaded, sent } = await h.wire(200, { cancelled: true });
    const stopped = await loaded.stop(INPUT, noId, RUN);
    assertEquals(stopped.kind, StopKind.UNRESOLVED);
    assertEquals(sent, []);
});

// ---------------------------------------------------------------------------
// fail closed, binding, estimate
// ---------------------------------------------------------------------------

Deno.test("place-call declares the sub-account binding", () =>
    h.assertBinding());

Deno.test("place-call fails closed without a sub-account, with no request at all", () =>
    h.assertFailsClosed(INPUT));

Deno.test("poll and stop fail closed without a sub-account, with no request", async () => {
    const state = await startedState();
    const { loaded, sent } = await h.wire(200, call("completed", null, 0), []);
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

Deno.test("the estimate holds one charged call", async () => {
    // estimateEndpoint has no resource reader, which a bound doc needs
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        resources: [OWNED],
    });
    const usage = loaded.estimate(INPUT);
    assertEquals(usage.evidence, { RESULT: 1 });
    assertEquals(usage.credits, { default: 10 });
});
