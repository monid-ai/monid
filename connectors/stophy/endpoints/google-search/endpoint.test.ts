import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "stophy#google/search";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): 1 call, meter lifted out of the output`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "bun runtime" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}google-search-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // keyless recording: the vendor meter says 0, so the derived fold bills
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { call: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(Object.keys(output).sort(), ["data", "requestId", "success"]);
    const data = output.data as Record<string, unknown>;
    assertEquals((data.results as unknown[]).length, 2); // record trims
});

Deno.test(`${ID} pages read (synthetic): the vendor meter wins`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: { query: "bun runtime", scrapeResults: true, scrapeLimit: 3 },
        },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-google-search-read-pages.json`,
        ),
    });
    assertEquals(result.isProviderError, false);
    // 2 of 3 results came back with markdown: 1 call + 2 pages, and the
    // vendor's creditsUsed (3) agrees with the fold
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { call: 1, read_page: 2 },
    });
    assertEquals(
        (result.output as Record<string, unknown>).creditsUsed,
        undefined,
    );
});

Deno.test(`${ID} estimate: scrapeLimit drives the worst case`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, { body: { query: "q" } }),
        { credits: { default: 1 }, evidence: { call: 1 } },
    );
    // scrapeResults on with no scrapeLimit: the vendor default, 3
    assertEquals(
        await estimateEndpoint(unit, {
            body: { query: "q", scrapeResults: true },
        }),
        { credits: { default: 4 }, evidence: { call: 1, read_page: 3 } },
    );
    assertEquals(
        await estimateEndpoint(unit, {
            body: { query: "q", scrapeResults: true, scrapeLimit: 5 },
        }),
        { credits: { default: 6 }, evidence: { call: 1, read_page: 5 } },
    );
});

Deno.test(`${ID} empty results (synthetic): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "zxqv no such phrase 7f3k" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-empty.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { call: 0 } });
});

Deno.test(`${ID} provider error (recorded 401): zero usage, message kept`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "test" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}provider-error.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assert(
        JSON.stringify(result.output).includes("This needs an API key"),
        JSON.stringify(result.output),
    );
});

Deno.test(`${ID} schema gate: strict body and the scrapeLimit range`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}google-search-ok.json`);
    const bad: Json[] = [
        {},
        { query: "q", scrapLimit: 2 },
        { query: "q", scrapeLimit: 6 },
        { query: "q", time: "lastWeek" },
        { query: "q", country: "usa" },
    ];
    for (const body of bad) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    const ok = await runEndpoint({
        unit,
        input: { body: { query: "q", time: "pastWeek", country: "US" } },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: `${ID} live (gated on STOPHY_API_KEY)`,
    ignore: liveSkip("stophy"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { query: "bun runtime" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const data = (result.output as Record<string, unknown>)
            .data as Record<string, unknown>;
        assert(Array.isArray(data.results) && data.results.length > 0);
    },
});
