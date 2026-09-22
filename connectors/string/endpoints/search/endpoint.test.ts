import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("string#search happy: no searchCount, evidence settles at one page", async () => {
    const unit = await testSealedUnit("string#search");
    const fixture = await loadFixture(`${fixturesDir}synthetic-search-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "best running shoes" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // no paging.pages on the response (request omitted searchCount) ⇒
    // evidence falls back to the documented single-page default.
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { PAGE: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test("string#search: engine defaults to google when omitted", async () => {
    const unit = await testSealedUnit("string#search");
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        { default?: unknown }
    >;
    assertEquals(properties.engine.default, "google");
});

Deno.test({
    name: "string#search live (gated on STRING_API_KEY)",
    ignore: liveSkip("string"),
    fn: async () => {
        const unit = await testSealedUnit("string#search");
        const result = await runEndpoint({
            unit,
            input: { body: { query: "deno 2 workspace monorepo guide" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { PAGE: 1 });
        assertEquals(result.usage.credits.default, 0.001);
    },
});
