import { assertEquals, assertRejects } from "@std/assert";
import { validateInput } from "@monid/connector-engine";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("keenable#v1/search-news happy (synthetic): news preset bills one credit", async () => {
    const unit = await testSealedUnit("keenable#v1/search-news");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-news.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query: "AI agent web search rankings" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.results as unknown[]).length, 1);
    assertEquals("usage" in output, false);
    assertEquals("credits" in output, false);
    assertEquals("costDollars" in output, false);
    assertEquals(
        (result.output as Record<string, unknown>).query,
        "AI agent web search rankings",
    );
});

Deno.test("keenable#v1/search-news: query required; published_after overridable", async () => {
    const unit = await testSealedUnit("keenable#v1/search-news");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-news.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: {} },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    const ok = await runEndpoint({
        unit,
        input: {
            body: {
                query: "AI agent web search rankings",
                published_after: "7d",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test("keenable#v1/search-news provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("keenable#v1/search-news");
    const fixture = await loadFixture(`${fixturesDir}unauthorized-search.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "AI agent web search rankings" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "keenable#v1/search-news live (gated on KEENABLE_API_KEY)",
    ignore: liveSkip("keenable"),
    fn: async () => {
        const unit = await testSealedUnit("keenable#v1/search-news");
        const result = await runEndpoint({
            unit,
            input: { body: { query: "AI agent web search rankings" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence).sort(), ["RESULT"]);
        const output = result.output as Record<string, unknown>;
        assertEquals(Array.isArray(output.results), true);
    },
});

Deno.test("keenable#v1/search-news: published_after defaults to 2d on the wire body", async () => {
    const unit = await testSealedUnit("keenable#v1/search-news");
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        { default?: unknown }
    >;
    assertEquals(properties.published_after.default, "2d");
    const effective = validateInput(unit.doc, {
        body: { query: "AI agent web search rankings" },
    });
    assertEquals(
        (effective.body as Record<string, unknown>).published_after,
        "2d",
    );
    const overridden = validateInput(unit.doc, {
        body: { query: "AI agent web search rankings", published_after: "7d" },
    });
    assertEquals(
        (overridden.body as Record<string, unknown>).published_after,
        "7d",
    );
});
