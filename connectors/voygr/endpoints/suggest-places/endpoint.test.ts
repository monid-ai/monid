import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, type OwnedResource, RunKind } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    assertInputAccepted,
    fixtureReader,
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { harness } from "../../test-support.ts";

/**
 * `voygr#suggest-places`. `happy` and `no-places-found` are real answers
 * from api.voygr.tech (2026-10-27), trimmed and header-free. The suspended
 * sub-account chain is SYNTHETIC (its body is written to match the shape
 * of VOYGR's refusals, not recorded). Sub-account ids are made up.
 */

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "voygr#suggest-places";
const h = harness(ID, import.meta.url);
const SUB_ID = "sub_00000000000000000000000000000001";
const OWNED: OwnedResource = {
    resource: "voygr/sub-account",
    externalId: SUB_ID,
    data: { reference: "monid:ws-1" },
};

const QUERY = "a quiet coffee shop in Hayes Valley, San Francisco";

async function run(fixture: string, body: Json) {
    return await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}${fixture}.json`),
        resources: [OWNED],
        scopeKey: "ws-1",
    });
}

async function fixtureBody(fixture: string): Promise<Json> {
    return (await loadFixture(`${FIXTURES}${fixture}.json`)).calls[0].res.body;
}

Deno.test("suggest answered bills 5", async () => {
    const body = { query: QUERY + ", open Saturday morning", limit: 2 };
    const result = await run("happy", body);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, await fixtureBody("happy"));
    const out = result.output as { suggestions: { phone_e164: string }[] };
    assertEquals(out.suggestions.length, 2);
    // what the run bills is what the estimate promised
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        resources: [OWNED],
        scopeKey: "ws-1",
    });
    assertEquals(loaded.estimate({ body }).credits, { default: 5 });
});

Deno.test("suggest 422 settles zero", async () => {
    const result = await run("no-places-found", {
        query: "a vegan bakery in Paradise, Montana open at 4am Sunday",
        limit: 2,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, await fixtureBody("no-places-found"));
    assertEquals(
        (result.output as { detail: { error_code: string } }).detail
            .error_code,
        "NO_PLACES_FOUND",
    );
});

Deno.test("suspended_sub_account_403_settles_zero", async () => {
    const result = await run("synthetic-sub-account-suspended", {
        query: QUERY,
    });
    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // returned as data, untouched
    assertEquals(
        result.output,
        await fixtureBody("synthetic-sub-account-suspended"),
    );
    assertEquals(
        (result.output as { detail: { error_code: string } }).detail
            .error_code,
        "SUB_ACCOUNT_SUSPENDED",
    );
});

Deno.test("suggest schema: query is required, bounds hold", async () => {
    const unit = await testSealedUnit(ID);
    const rejected: [string, Json][] = [
        ["no query", { limit: 2 }],
        ["empty query", { query: "" }],
        ["query over 500", { query: "x".repeat(501) }],
        ["limit 0", { query: QUERY, limit: 0 }],
        ["limit 7", { query: QUERY, limit: 7 }],
        ["location_hint over 200", {
            query: QUERY,
            location_hint: "x".repeat(201),
        }],
        ["booking_name over 100", {
            query: QUERY,
            booking_name: "x".repeat(101),
        }],
        ["callback_phone under 3", { query: QUERY, callback_phone: "12" }],
        ["callback_phone over 32", {
            query: QUERY,
            callback_phone: "1".repeat(33),
        }],
        ["a typo'd key", { query: QUERY, limt: 2 }],
    ];
    for (const [shape, body] of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body },
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
        input: {
            body: {
                query: QUERY,
                location_hint: "Wicker Park",
                limit: 6,
                booking_name: "Alex",
                callback_phone: "+13125550188",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}happy.json`),
        resources: [OWNED],
    });
});

Deno.test("suggest declares the sub-account binding", async () => {
    const { doc } = await testSealedUnit(ID);
    assertEquals(doc.resources?.uses?.map((b) => b.id), ["voygr/sub-account"]);
});

Deno.test("suggest fails closed without a sub-account: nothing goes upstream", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay", // no fixture: any upstream call fails the test
        scopeKey: "ws-1",
    });
    const result = await loaded.start({ body: { query: QUERY } });
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 503);
    assertEquals(
        (result.output as { code: string }).code,
        "SUB_ACCOUNT_UNAVAILABLE",
    );
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("suggest sends the body, the key and the workspace's sub-account", async () => {
    const sent: {
        url: string;
        method: string;
        headers: Headers;
        body: Json;
    }[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                sent.push({
                    url: String(url),
                    method: init?.method ?? "GET",
                    headers: new Headers(init?.headers),
                    body: JSON.parse(String(init?.body)),
                });
                return Promise.resolve(Response.json({ suggestions: [] }));
            },
        }),
        resources: fixtureReader([OWNED]),
        scopeKey: "ws-1",
    });
    const loaded = await engine.load(await testSealedUnit(ID));
    const body = { query: QUERY, limit: 3, callback_phone: "+13125550188" };
    const result = await loaded.run({ body });
    assertEquals(result.httpStatus, 200);
    assertEquals(sent.length, 1);
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].url, "https://api.voygr.tech/v1/places/suggest");
    assertEquals(sent[0].body, body);
    assertEquals(sent[0].headers.get("x-api-key"), "test-key");
    assertEquals(sent[0].headers.get("x-sub-account"), SUB_ID);
    assertEquals(result.usage.credits, { default: 5 });
});

Deno.test("suggest gives up a little after VOYGR's 15 s limit", async () => {
    const { doc } = await testSealedUnit(ID);
    assertEquals(doc.timeouts.requestMs, 20_000);
});

Deno.test({
    name:
        "voygr#suggest-places live: an answered request lists suggestions and bills credits",
    ignore: liveSkip("voygr"),
    fn: async () => {
        const result = await h.live({ body: { query: QUERY, limit: 1 } });
        assertEquals(result.httpStatus, 200, JSON.stringify(result));
        assertEquals(result.isProviderError, false, JSON.stringify(result));
        const out = result.output as { suggestions: { phone_e164: string }[] };
        assert(Array.isArray(out.suggestions), JSON.stringify(out));
        assert(
            out.suggestions.length > 0,
            `VOYGR answered with no suggestions: ${JSON.stringify(out)}`,
        );
        assertEquals(typeof out.suggestions[0].phone_e164, "string");
        // the bill is a number of credits, whatever VOYGR's price is today
        assertEquals(typeof result.usage.credits.default, "number");
        assertEquals(typeof result.usage.evidence.CALL, "number");
    },
});
