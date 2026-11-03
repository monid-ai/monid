import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("keenable#v1/search-papers happy (synthetic): paper preset bills one credit", async () => {
    const unit = await testSealedUnit("keenable#v1/search-papers");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-papers.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                query: "mixture of experts routing",
                site: "arxiv.org",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { RESULT: 1 },
    });
});

Deno.test("keenable#v1/search-papers: query required; site optional", async () => {
    const unit = await testSealedUnit("keenable#v1/search-papers");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-papers.json`,
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
        input: { body: { query: "mixture of experts routing" } },
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
