import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "dansugc#broll";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = { queryParams: { search: "surprised", limit: 2 } };

for (
    const [scenario, queryParams] of [
        ["happy", INPUT.queryParams],
        ["semantic", {
            semantic_search: "woman laughing at her phone",
            limit: 2,
        }],
    ] as const
) {
    Deno.test(`${ID} ${scenario} (recorded): free, the whole body relays`, async () => {
        const fixture = await loadFixture(`${fixturesDir}${scenario}.json`);
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { queryParams },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        // whole-output equality: the recorded 2 clips, nothing added or stripped
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals((result.output as { videos: Json[] }).videos.length, 2);
    });
}

Deno.test(`${ID} provider error (synthetic 401): zero usage, error digested`, async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUT,
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        ),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { message: string }).message,
        "Invalid API key",
    );
});

Deno.test(`${ID}: the schema gate — limit caps at 100, unknown keys rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const run = (queryParams: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { queryParams: queryParams as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            { search: "surprised", limit: 101 },
            { search: "surprised", media_type: "gif" },
            { search: "surprised", sort: "newest" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    {
        // the near twin passes the gate and fails later, at replay URL
        // matching — proving validation let it through
        const err = await assertRejects(
            () => run({ search: "surprised", limit: 100 }),
            Error,
        );
        assertEquals(err.message.includes("INVALID_INPUT"), false, err.message);
    }
});

Deno.test({
    name: `${ID} live (gated on DANSUGC_API_KEY)`,
    ignore: liveSkip("dansugc"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { queryParams: { search: "surprised", limit: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        const videos = (result.output as { videos: Json[] }).videos;
        assertEquals(Array.isArray(videos), true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
