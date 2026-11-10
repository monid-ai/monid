import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("keenable#v1/search-contents happy (synthetic): long-extract preset bills one credit", async () => {
    const unit = await testSealedUnit("keenable#v1/search-contents");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-contents.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { query: "latest EU AI Act enforcement guidance" } },
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
        "latest EU AI Act enforcement guidance",
    );
});

Deno.test("keenable#v1/search-contents: query required; snippet_max_length overridable", async () => {
    const unit = await testSealedUnit("keenable#v1/search-contents");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-contents.json`,
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
                query: "latest EU AI Act enforcement guidance",
                snippet_max_length: 2000,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        { default?: unknown }
    >;
    assertEquals(properties.snippet_max_length.default, 10000);
});

Deno.test("keenable#v1/search-contents provider error (recorded 401): data, zero usage", async () => {
    const unit = await testSealedUnit("keenable#v1/search-contents");
    const fixture = await loadFixture(`${fixturesDir}unauthorized-search.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "latest EU AI Act enforcement guidance" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "keenable#v1/search-contents live (gated on KEENABLE_API_KEY)",
    ignore: liveSkip("keenable"),
    fn: async () => {
        const unit = await testSealedUnit("keenable#v1/search-contents");
        const result = await runEndpoint({
            unit,
            input: { body: { query: "latest EU AI Act enforcement guidance" } },
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
