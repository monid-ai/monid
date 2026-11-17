import { assertEquals, assertRejects } from "@std/assert";
import { type Json, type RunInput } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { harness, OWNED } from "../../test-support.ts";

/**
 * `voygr#answer-call`. SYNTHETIC, shaped from the public OpenAPI
 * (`AnswerRequest`, `AnswerResponse`). A question that is no longer open
 * is a 200 with `delivered: false` (not an error); a call that is not this
 * sub-account's is a 404. Ids are made up.
 */

const ID = "voygr#answer-call";
const h = harness(ID, import.meta.url);
const CALL = { call_id: "c_synthetic02" };
const ANSWER = {
    answer: "Under the name Rivera.",
    request_id: "req_synthetic01",
};

Deno.test("answer-call delivered true settles zero", async () => {
    const result = await h.run("synthetic-delivered", {
        pathParams: CALL,
        body: ANSWER,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { delivered: true, reason: "delivered" });
});

Deno.test("answer-call delivered false passes through as an answer", async () => {
    const result = await h.run("synthetic-no-pending-request", {
        pathParams: CALL,
        body: ANSWER,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        delivered: false,
        reason: "no_pending_request",
    });
});

Deno.test("foreign call 404 settles zero and passes through", async () => {
    const result = await h.run("synthetic-foreign-call-404", {
        pathParams: { call_id: "c_synthetic99" },
        body: { answer: "Under the name Rivera." },
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { detail: "Call not found" });
});

Deno.test("answer-call schema: exactly one of answer or outcome", async () => {
    const unit = await testSealedUnit(ID);
    const rejected: [string, RunInput][] = [
        ["no body", { pathParams: CALL }],
        ["an empty body", { pathParams: CALL, body: {} }],
        ["request_id alone", { pathParams: CALL, body: { request_id: "r1" } }],
        ["answer and outcome", {
            pathParams: CALL,
            body: { answer: "yes", outcome: "timeout", request_id: "r1" },
        }],
        ["outcome without request_id", {
            pathParams: CALL,
            body: { outcome: "timeout" },
        }],
        ["an unknown outcome", {
            pathParams: CALL,
            body: { outcome: "gave_up", request_id: "r1" },
        }],
        ["an empty answer", { pathParams: CALL, body: { answer: "" } }],
        ["an answer over 4000", {
            pathParams: CALL,
            body: { answer: "x".repeat(4001) },
        }],
        ["a request_id over 64", {
            pathParams: CALL,
            body: { answer: "yes", request_id: "r".repeat(65) },
        }],
        ["a typo'd key", {
            pathParams: CALL,
            body: { answer: "yes", requestid: "r1" },
        }],
        ["no call_id", { pathParams: {}, body: { answer: "yes" } }],
        ["an empty call_id", {
            pathParams: { call_id: "" },
            body: { answer: "yes" },
        }],
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
        { pathParams: CALL, body: { answer: "yes" } },
        { pathParams: CALL, body: ANSWER },
        { pathParams: CALL, body: { answer: "x".repeat(4000) } },
        { pathParams: CALL, body: { outcome: "timeout", request_id: "r1" } },
        {
            pathParams: CALL,
            body: { outcome: "transport_failure", request_id: "r".repeat(64) },
        },
    ];
    for (const input of accepted) {
        await assertInputAccepted({
            unit,
            input,
            mode: "replay",
            fixture: await h.fixture("synthetic-delivered"),
            resources: [OWNED],
        });
    }
});

Deno.test("answer-call declares the sub-account binding", () =>
    h.assertBinding());

Deno.test("answer-call fails closed without a sub-account", () =>
    h.assertFailsClosed({ pathParams: CALL, body: ANSWER }));

Deno.test("answer-call sends the answer and the workspace's sub-account", () =>
    h.assertOnTheWire({ pathParams: CALL, body: ANSWER }, {
        method: "POST",
        url: "https://api.voygr.tech/calls/c_synthetic02/answer",
        body: ANSWER,
    }, { body: { delivered: true, reason: "delivered" } }));

Deno.test("answer-call sends an outcome with its request_id", () =>
    h.assertOnTheWire({
        pathParams: CALL,
        body: { outcome: "timeout", request_id: "req_synthetic01" },
    }, {
        method: "POST",
        url: "https://api.voygr.tech/calls/c_synthetic02/answer",
        body: { outcome: "timeout", request_id: "req_synthetic01" },
    }, { body: { delivered: true, reason: "delivered" } }));

Deno.test({
    name: "voygr#answer-call live: an unknown call_id is a 404 at zero",
    ignore: liveSkip("voygr"),
    fn: async () => {
        // VOYGR checks the call is this workspace's before it delivers
        // anything, so no call hears this answer
        const result = await h.live({
            pathParams: { call_id: "c_00000000000000000000000000000000" },
            body: { answer: "This is a connector test." },
        });
        assertEquals(result.httpStatus, 404, JSON.stringify(result));
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
