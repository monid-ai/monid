import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "lev8#v1/deep-search";

Deno.test("lev8: five endpoints, one bearer auth fn, one pool, no consolidate", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("lev8#")
    ).sort();
    assertEquals(ids, [
        "lev8#v1/contact-search",
        "lev8#v1/deep-search",
        "lev8#v1/enrich",
        "lev8#v1/entity-search",
        "lev8#v1/extract",
    ]);
    const auth = bundle.endpoints[ID].auth.inject.$fn.key;
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, auth, id);
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(Object.keys(doc.usage.credits), ["default"], id);
        assert(doc.request.url.startsWith("https://app.lev8.com/v1/"), id);
        assertEquals(doc.request.method, "POST", id);
    }
    // the entity search id is pinned; its wire route is create_task
    assertEquals(
        bundle.endpoints["lev8#v1/entity-search"].request.url,
        "https://app.lev8.com/v1/entity-search/create_task",
    );
    // credit balance is deliberately not exposed (design D2)
    assert(!ids.some((id) => id.includes("credit")));
});

Deno.test("lev8: every paid call carries a run-stable Idempotency-Key and the bearer token", async () => {
    const seen: Headers[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "lev8_live_test" }),
            fetch: (_input, init) => {
                seen.push(new Headers(init?.headers));
                return Promise.resolve(
                    new Response(
                        JSON.stringify({ success: true, answer: "ok" }),
                        {
                            status: 200,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(ID));
    await loaded.run({ body: { query: "Who is the CEO of OpenAI?" } });
    await loaded.run({ body: { query: "Who is the CEO of OpenAI?" } });
    assertEquals(seen.length, 2);
    for (const h of seen) {
        assertEquals(h.get("authorization"), "Bearer lev8_live_test");
        assertEquals(h.get("accept"), "application/json");
        assert(/:call$/.test(h.get("idempotency-key") ?? ""));
        assert((h.get("idempotency-key") ?? "").length <= 128);
    }
    // one key per RUN: two runs never share one (Lev8 would replay the first)
    assert(seen[0].get("idempotency-key") !== seen[1].get("idempotency-key"));
});

Deno.test("lev8#v1/deep-search happy (synthetic): 2 credits, answer passed through", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { query: "What does OpenAI do and who is its CEO?" } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-deep-search-ok.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as { success: boolean; answer: unknown };
    assertEquals(output.success, true);
    assertEquals(
        (output.answer as Record<string, unknown>).Result,
        "OpenAI is an AI research and product company. Its CEO is Sam Altman.",
    );
});

Deno.test("lev8#v1/deep-search business failure (synthetic): success false bills 0", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { query: "zzqxv" } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-business-failure.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test("lev8#v1/deep-search provider error (recorded 401): data, zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { query: "What does OpenAI do?" } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}unauthorized.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { error: { type: string } }).error.type,
        "authentication_error",
    );
});

Deno.test("lev8#v1/deep-search: estimate promises one answer", async () => {
    assertEquals(
        await estimateEndpoint(await testSealedUnit(ID), {
            body: { query: "x" },
        }),
        { credits: { default: 2 }, evidence: { RESULT: 1 } },
    );
});

Deno.test("lev8#v1/deep-search: query required, 1–4000 chars, strict body", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-deep-search-ok.json`,
    );
    const rejected: Json[] = [
        {},
        { query: "" },
        { query: "x".repeat(4001) },
        { query: "x", stream: true },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body).slice(0, 60),
        );
    }
    await assertInputAccepted({
        unit,
        input: { body: { query: "x".repeat(4000) } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "lev8#v1/deep-search live (gated on LEV8_API_KEY)",
    ignore: liveSkip("lev8"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { query: "Who is the CEO of OpenAI?" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
        assertEquals(
            typeof (result.output as { success: unknown }).success,
            "boolean",
        );
    },
});
