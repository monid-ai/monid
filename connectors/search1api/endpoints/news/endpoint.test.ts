import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "search1api#news";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): flat 1 credit`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: { query: "artificial intelligence", max_results: 3 },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}news-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 1 });
    const output = result.output as Record<string, unknown>;
    // recorded fixture is trimmed by `deno task record`
    assertEquals((output.results as unknown[]).length, 2);
});

Deno.test(`${ID} schema gate: a web-only engine is rejected before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}news-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    body: { query: "q", search_service: "github" },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: `${ID} live (gated on SEARCH1API_API_KEY)`,
    ignore: liveSkip("search1api"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { query: "technology", max_results: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.credits, { default: 1 });
    },
});
