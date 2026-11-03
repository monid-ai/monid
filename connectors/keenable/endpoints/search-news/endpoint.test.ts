import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

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
