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
 * `voygr#list-calls`. SYNTHETIC: a real call list would hold the account's
 * own calls, so the fixture is shaped from the public OpenAPI CallDTO. The
 * ids, the phone numbers (555-01xx) and the customer id are made up.
 */

const ID = "voygr#list-calls";
const h = harness(ID, import.meta.url);

type CallRow = Record<string, Json>;

Deno.test("list-calls replays the list for free", async () => {
    const result = await h.run("synthetic-happy", {
        queryParams: { limit: 2 },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const calls = result.output as CallRow[];
    assertEquals(
        calls.length,
        (await h.recorded("synthetic-happy") as CallRow[]).length,
    );
    assertEquals(calls.map((c) => c.call_id), [
        "c_synthetic02",
        "c_synthetic01",
    ]);
    assertEquals(calls[1].outcome_charge_cents, 10);
    assertEquals(
        calls[1].outcome_summary,
        "The kitchen closes at 10pm tonight.",
    );
    // the list view carries no transcript
    assertEquals(calls[1].transcript_full, null);
});

Deno.test("list-calls output carries no customer_id or recording_url", async () => {
    // the raw answer has both: the provider projection removes them
    const raw = await h.recorded("synthetic-happy") as CallRow[];
    assert(raw.every((c) => "customer_id" in c && "recording_url" in c));
    const result = await h.run("synthetic-happy", {
        queryParams: { limit: 2 },
    });
    const calls = result.output as CallRow[];
    assertEquals(calls.length, 2);
    for (const call of calls) {
        assert(!("customer_id" in call));
        assert(!("recording_url" in call));
        // what the recording URL announced is still said by the flags
        assert("has_recording" in call && "recording_status" in call);
    }
    assertEquals(calls[1].has_recording, true);
    assertEquals(calls[1].recording_status, "available");
});

Deno.test("list-calls 401 settles zero and passes through", async () => {
    const result = await h.run("synthetic-invalid-key-401", {
        queryParams: { limit: 2 },
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, await h.recorded("synthetic-invalid-key-401"));
    assertEquals(result.output, { detail: { error: "invalid API key" } });
});

Deno.test("list-calls schema: limit is an integer from 1 to 1000", async () => {
    const unit = await testSealedUnit(ID);
    const rejected: [string, RunInput][] = [
        ["limit 0", { queryParams: { limit: 0 } }],
        ["limit 1001", { queryParams: { limit: 1001 } }],
        ["limit 1.5", { queryParams: { limit: 1.5 } }],
        ["limit as text", { queryParams: { limit: "5" } }],
        ["a typo'd key", { queryParams: { limt: 5 } }],
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
        {},
        { queryParams: {} },
        { queryParams: { limit: 1 } },
        { queryParams: { limit: 1000 } },
    ];
    for (const input of accepted) {
        await assertInputAccepted({
            unit,
            input,
            mode: "replay",
            fixture: await h.fixture("synthetic-happy"),
            resources: [OWNED],
        });
    }
});

Deno.test("list-calls declares the sub-account binding", () =>
    h.assertBinding());

Deno.test("list-calls fails closed without a sub-account", () =>
    h.assertFailsClosed({}));

Deno.test("list-calls sends limit in the query of a bodyless GET", () =>
    h.assertOnTheWire({ queryParams: { limit: 25 } }, {
        method: "GET",
        url: "https://api.voygr.tech/calls?limit=25",
    }, { body: [] }));

Deno.test("list-calls without a limit sends no query", () =>
    h.assertOnTheWire({}, {
        method: "GET",
        url: "https://api.voygr.tech/calls",
    }, { body: [] }));

Deno.test({
    name:
        "voygr#list-calls live: the workspace's calls come back without customer_id or recording_url",
    ignore: liveSkip("voygr"),
    fn: async () => {
        const result = await h.live({ queryParams: { limit: 1 } });
        assertEquals(result.httpStatus, 200, JSON.stringify(result));
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        // a new sub-account may have no calls: then the list is empty
        const calls = result.output as CallRow[];
        assert(Array.isArray(calls), JSON.stringify(calls));
        assert(calls.length <= 1, `limit 1 returned ${calls.length}`);
        for (const call of calls) {
            assertEquals(typeof call.call_id, "string");
            assert(!("customer_id" in call));
            assert(!("recording_url" in call));
        }
    },
});
