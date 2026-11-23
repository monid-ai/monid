import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "datawebot#search";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("datawebot#search inline answer: the meter bills 5, balance and meter leave the payload", async () => {
    const result = await run("synthetic-search-done.json", {
        query: "air fryer",
        site: "walmart.com",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CREDIT: 5 },
    });
    const output = result.output as Record<string, Record<string, unknown>>;
    assertEquals((output.products as unknown as unknown[]).length, 2);
    assertEquals("credits_left" in output.meta, false);
    assertEquals("credits_used" in output.meta, false);
    assertEquals(output.meta.as_of, "2026-11-23T04:10:00.000Z");
});

Deno.test("datawebot#search working: polls the free GET until done", async () => {
    const result = await run("synthetic-search-working.json", {
        query: "air fryer",
        site: "walmart.com",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CREDIT: 5 },
    });
    assertEquals((result.output as Record<string, unknown>).status, "done");
});

Deno.test("datawebot#search failed before a page loaded: provider error, zero usage", async () => {
    const result = await run("synthetic-search-failed-free.json", {
        query: "air fryer",
        site: "walmart.com",
    });
    assertEquals(result.httpStatus, 502);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("datawebot#search empty but charged: settles as success at the vendor's 25", async () => {
    const result = await run("synthetic-search-empty-charged.json", {
        query: "a product nobody sells",
        site: "any",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 25 },
        evidence: { CREDIT: 25 },
    });
});

Deno.test("datawebot#search 401 is data, zero usage", async () => {
    const result = await run("synthetic-provider-error.json", {
        query: "air fryer",
        site: "walmart.com",
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("datawebot#search estimate: 5 on a named shop, 25 across shops, capped by max_credits", async () => {
    const unit = await testSealedUnit(ID);
    const named = await estimateEndpoint(unit, {
        body: { query: "air fryer", site: "walmart.com" },
    });
    assertEquals(named.credits, { default: 5 });
    const any = await estimateEndpoint(unit, {
        body: { query: "air fryer", site: "any" },
    });
    assertEquals(any.credits, { default: 25 });
    const capped = await estimateEndpoint(unit, {
        body: { query: "air fryer", site: "any", max_credits: 10 },
    });
    assertEquals(capped.credits, { default: 10 });
});

Deno.test("datawebot#search requires query and site, and sends capability search", async () => {
    const unit = await testSealedUnit(ID);
    const required = unit.doc.input.schema.body?.required as string[];
    assert(required.includes("query"));
    assert(required.includes("site"));
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assert(!("capability" in properties), "capability is set by the connector");
});

Deno.test("datawebot#search without a shop fails INVALID_INPUT before the wire", async () => {
    await assertRejects(
        () => run("synthetic-search-done.json", { query: "air fryer" }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            run("synthetic-search-done.json", {
                query: "air fryer",
                site: "walmart.com",
                capability: "endpoint",
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: "datawebot#search live (gated on DATAWEBOT_API_KEY)",
    ignore: liveSkip("datawebot"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: { query: "air fryer", site: "walmart.com", limit: 3 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
