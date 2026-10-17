import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { EngineError, EngineErrorCode } from "@monid/connector-engine";
import { type Json, RunKind, StopKind } from "@shared/core";
import {
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (path: string) => loadFixture(`${HERE}${path}.json`);

const CALLS = "call4me#calls";
const CATEGORIES = "call4me#requirements";
const REQUIREMENTS = "call4me#requirements/{category}";

/** The live NIST talking-clock call the recorded chain was made with. */
const NIST_INPUT = {
    body: {
        to: "+13034997111",
        business: "NIST time of day line",
        goal: "Listen to the NIST time announcement and note the current " +
            "UTC time it reads out.",
        category: "general",
        details: { questions: "What UTC time does the announcement read?" },
        on_behalf_of: "monid review",
        max_minutes: 1,
    },
};

const BOOKING_INPUT = {
    body: {
        to: "+14155550123",
        business: "Example Bistro",
        goal: "Book a table for 2 tonight at 7pm.",
        category: "restaurant",
        details: { party_size: "2", date_time: "tonight at 7pm" },
        on_behalf_of: "Sam",
        max_minutes: 5,
    },
};

// ---------------------------------------------------------------------------
// calls: the metered async run
// ---------------------------------------------------------------------------

Deno.test("call4me calls recorded: the run IS the call and settles on cost_cents", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(CALLS),
        input: NIST_INPUT,
        mode: "replay",
        fixture: await fixture("endpoints/calls/fixtures/recorded-nist-clock"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the vendor's meter is the quantity, so claim and fold agree: no
    // mismatch even though the call ran past its 1-minute cap
    assertEquals(result.usage, {
        credits: { default: 0.5 },
        evidence: { CREDIT: 50 },
    });
    // two polls: one in progress, then the finished record
    assertEquals(result.timing.attempts, 2);
    const out = result.output as Record<string, Json>;
    assertEquals(out.finished, true);
    assertEquals((out.outcome as Record<string, Json>).result, "done");
});

Deno.test("call4me calls: 422 Not calling yet is data, zero usage, digested", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(CALLS),
        input: BOOKING_INPUT,
        mode: "replay",
        fixture: await fixture("fixtures/synthetic-not-calling-yet"),
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const out = result.output as Record<string, Json>;
    assert(String(out.message).startsWith("Not calling yet"));
    assert(out.raw !== undefined);
});

Deno.test("call4me calls: a 429 on POLL is a retriable failure, never a zero-usage completion", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(CALLS),
        input: BOOKING_INPUT,
        mode: "replay",
        fixture: await fixture("fixtures/synthetic-poll-429"),
    });
    const started = await loaded.start(BOOKING_INPUT, {
        runId: "test-run-429",
    });
    assert(started.kind === RunKind.RUNNING, "start parks the live call");
    const error = await assertRejects(() =>
        loaded.poll(BOOKING_INPUT, started.state)
    );
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.EXECUTION_FAILED);
    assertEquals(error.retriable, true);
});

Deno.test("call4me calls: STOP hangs up and settles on the finished record", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(CALLS),
        input: BOOKING_INPUT,
        mode: "replay",
        fixture: await fixture("fixtures/synthetic-call-stop"),
    });
    const run = { runId: "test-run-1" };
    const started = await loaded.start(BOOKING_INPUT, run);
    assert(started.kind === RunKind.RUNNING, "start parks the live call");
    assertEquals(started.state.externalRunId, "call_test1");
    const stopped = await loaded.stop(BOOKING_INPUT, started.state, run);
    assert(stopped.kind === RunKind.COMPLETED, "stop settles");
    assertEquals(stopped.usage.credits, { default: 0.25 });
    assertEquals(stopped.usage.evidence, { CREDIT: 25 });
});

Deno.test("call4me calls: STOP without a finished record is UNRESOLVED", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(CALLS),
        input: BOOKING_INPUT,
        mode: "replay",
        fixture: await fixture("fixtures/synthetic-call-stop-unresolved"),
    });
    const run = { runId: "test-run-2" };
    const started = await loaded.start(BOOKING_INPUT, run);
    assert(started.kind === RunKind.RUNNING);
    const stopped = await loaded.stop(BOOKING_INPUT, started.state, run);
    assertEquals(stopped.kind, StopKind.UNRESOLVED);
    assert(stopped.kind === StopKind.UNRESOLVED);
    assertEquals(stopped.state.externalRunId, "call_test1");
});

Deno.test("call4me calls: the hold is the cap at 25 cents a minute and grows with the call", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(CALLS),
        input: BOOKING_INPUT,
        mode: "replay",
    });
    // admission: 5 minutes × 25 cents
    assertEquals(loaded.estimate(BOOKING_INPUT).credits, { default: 1.25 });
    // inside the cap the hold stays put
    assertEquals(
        loaded.accrued(BOOKING_INPUT, 240_000).credits,
        { default: 1.25 },
    );
    // a call on hold past its cap: 7.5 minutes elapsed → 8 × 25 cents
    assertEquals(
        loaded.accrued(BOOKING_INPUT, 450_000).credits,
        { default: 2 },
    );
});

Deno.test("call4me calls: the binding keeps account-wide fields out and states who the call is for", async () => {
    const without = (key: string) => {
        const body: Record<string, Json> = { ...BOOKING_INPUT.body };
        delete body[key];
        return { body };
    };
    for (
        const input of [
            // the vendor would default these from the shared account
            without("on_behalf_of"),
            without("max_minutes"),
            // these act on the shared account's phone and numbers
            { body: { ...BOOKING_INPUT.body, listen_in: true } },
            { body: { ...BOOKING_INPUT.body, connect_when: "at pickup" } },
            { body: { ...BOOKING_INPUT.body, from: "+14155559999" } },
            // vendor-strict: unknown keys and categories never reach the wire
            { body: { ...BOOKING_INPUT.body, unknown: true } },
            { body: { ...BOOKING_INPUT.body, category: "pizza" } },
        ]
    ) {
        await assertRejects(
            async () =>
                runEndpoint({
                    unit: await testSealedUnit(CALLS),
                    input,
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(input.body),
        );
    }
});

// ---------------------------------------------------------------------------
// the free pre-flight reads
// ---------------------------------------------------------------------------

Deno.test("call4me requirements recorded: the categories list is free", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(CATEGORIES),
        input: {},
        mode: "replay",
        fixture: await fixture(
            "endpoints/categories/fixtures/recorded-categories",
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const out = result.output as { categories: { slug: string }[] };
    assertEquals(out.categories[0].slug, "medical");
});

Deno.test("call4me requirements recorded: the shared account's profile is projected away", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(REQUIREMENTS),
        input: { pathParams: { category: "general" } },
        mode: "replay",
        fixture: await fixture(
            "endpoints/requirements/fixtures/recorded-requirements-general",
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        category: "general",
        name: "Questions for a business",
        fields: [
            {
                key: "questions",
                label: "what to find out",
                required: true,
                ask: "What exactly should the caller find out?",
            },
            {
                key: "full_name",
                label: "full name",
                required: false,
                ask: "What name should the caller give if asked?",
            },
        ],
    });
});

Deno.test("call4me: one error digest across the three docs", async () => {
    const bundle = await testBundle();
    const docs = Object.values(bundle.endpoints).filter((doc) =>
        doc.id.startsWith("call4me#")
    );
    assertEquals(docs.map((doc) => doc.id).sort(), [
        CALLS,
        CATEGORIES,
        REQUIREMENTS,
    ]);
    assertEquals(
        new Set(docs.map((doc) => doc.output?.fromError?.$fn.key)).size,
        1,
    );
});

Deno.test({
    name: "call4me#requirements/{category} live (gated on CALL4ME_API_KEY)",
    ignore: liveSkip("call4me"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(REQUIREMENTS),
            input: { pathParams: { category: "restaurant" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
