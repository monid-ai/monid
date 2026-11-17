import { assert, assertEquals, assertRejects } from "@std/assert";
import { type Json, type RunInput } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { harness, OWNED } from "../../test-support.ts";

/**
 * `voygr#get-call`. SYNTHETIC: a real call holds a real callee and
 * transcript, so the fixtures are shaped from the public OpenAPI CallDTO
 * plus the two fields of the single-call read: `pending_questions` (each
 * with `request_id`, `question` and `expires_at`) and
 * `pending_questions_unavailable`, present only when the questions could
 * not be read. The ids, the phone numbers (555-01xx) and the customer id
 * are made up.
 */

const ID = "voygr#get-call";
const h = harness(ID, import.meta.url);

type CallRow = Record<string, Json>;

Deno.test("get-call replays a call for free", async () => {
    const result = await h.run("synthetic-finished-call", {
        pathParams: { call_id: "c_synthetic01" },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const call = result.output as CallRow;
    assertEquals(call.call_id, "c_synthetic01");
    assertEquals(call.status, "completed");
    assertEquals(call.result, "goal_met");
    assertEquals(call.outcome_charge_cents, 10);
    assertEquals(call.pending_questions, []);
    assertEquals((call.transcript_full as Json[]).length, 4);
});

Deno.test("get-call passes pending_questions through", async () => {
    const result = await h.run("synthetic-live-call", {
        pathParams: { call_id: "c_synthetic02" },
    });
    assertEquals(result.httpStatus, 200);
    const call = result.output as CallRow;
    assertEquals(call.status, "in_progress");
    assertEquals(call.outcome_type, null);
    // untouched: the same three keys, in the shape VOYGR sends
    assertEquals(call.pending_questions, [{
        request_id: "req_synthetic01",
        question:
            "They ask for a surname for the table. What name should it be under?",
        expires_at: "2026-10-27T09:06:40",
    }]);
    assertEquals(
        call.pending_questions,
        (await h.recorded("synthetic-live-call") as CallRow).pending_questions,
    );
    // the flag is present only when the questions could not be read
    assert(!("pending_questions_unavailable" in call));
});

Deno.test("get-call passes pending_questions_unavailable through", async () => {
    const result = await h.run("synthetic-pending-unavailable", {
        pathParams: { call_id: "c_synthetic02" },
    });
    assertEquals(result.httpStatus, 200);
    const call = result.output as CallRow;
    assertEquals(call.pending_questions, []);
    assertEquals(call.pending_questions_unavailable, true);
});

Deno.test("get-call output carries no customer_id or recording_url", async () => {
    const raw = await h.recorded("synthetic-finished-call") as CallRow;
    assert("customer_id" in raw && "recording_url" in raw);
    const result = await h.run("synthetic-finished-call", {
        pathParams: { call_id: "c_synthetic01" },
    });
    const call = result.output as CallRow;
    assert(!("customer_id" in call));
    assert(!("recording_url" in call));
    assertEquals(call.has_recording, true);
    assertEquals(call.recording_status, "available");
});

Deno.test("foreign call 404 settles zero and passes through", async () => {
    const result = await h.run("synthetic-foreign-call-404", {
        pathParams: { call_id: "c_synthetic99" },
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Call not found" });
});

Deno.test("get-call schema: call_id is required and non-empty", async () => {
    const unit = await testSealedUnit(ID);
    const rejected: [string, RunInput][] = [
        ["no path params", {}],
        ["no call_id", { pathParams: {} }],
        ["empty call_id", { pathParams: { call_id: "" } }],
        ["a typo'd key", { pathParams: { callid: "c_1" } }],
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
    await assertInputAccepted({
        unit,
        input: { pathParams: { call_id: "c_synthetic01" } },
        mode: "replay",
        fixture: await h.fixture("synthetic-finished-call"),
        resources: [OWNED],
    });
});

Deno.test("get-call declares the sub-account binding", () => h.assertBinding());

Deno.test("get-call fails closed without a sub-account", () =>
    h.assertFailsClosed({ pathParams: { call_id: "c_synthetic01" } }));

Deno.test("get-call sends a bodyless GET with the workspace's sub-account", () =>
    h.assertOnTheWire({ pathParams: { call_id: "c_synthetic01" } }, {
        method: "GET",
        url: "https://api.voygr.tech/calls/c_synthetic01",
    }));

Deno.test("get-call encodes the call id into one path segment", () =>
    h.assertOnTheWire({ pathParams: { call_id: "a/b?c" } }, {
        method: "GET",
        url: "https://api.voygr.tech/calls/a%2Fb%3Fc",
    }));

Deno.test({
    name: "voygr#get-call live: an unknown call_id is a 404 at zero",
    ignore: liveSkip("voygr"),
    fn: async () => {
        const result = await h.live({
            pathParams: { call_id: "c_00000000000000000000000000000000" },
        });
        assertEquals(result.httpStatus, 404, JSON.stringify(result));
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
