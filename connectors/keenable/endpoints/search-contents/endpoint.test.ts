import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

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
