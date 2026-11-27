import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "dealport#api/v1/pages";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        domains: [
            "buckeyeclimate-example.com",
            "cuyahogamechanical-example.com",
        ],
    },
};

Deno.test(`${ID} happy (synthetic): 1 cached + 1 live fetch bills $0.01 and strips receipts`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { RESULT: 1 },
    });

    const output = result.output as Record<string, Json>;
    const data = output.data as Record<string, Json>;
    assertEquals("cost_usd" in output, false);
    assertEquals("cost_usd" in data, false);
    assertEquals(data.cached_count, 1);
    assertEquals(data.live_fetched_count, 1);
    assertEquals((data.items as unknown[]).length, 2);
});

Deno.test(`${ID} cached (synthetic): 30-day cached website Markdown settles at $0.00`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-cached.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { domains: ["buckeyeclimate-example.com"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
});

Deno.test(`${ID} provider error (synthetic 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { domains: ["buckeyeclimate-example.com"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} schema gate and deduplicated estimate: requires targets and deduplicates repeats`, async () => {
    const unit = await testSealedUnit(ID);
    const badInputs: Record<string, Json>[] = [
        {},
        { domains: [] },
        { company_ids: ["not-a-uuid"] },
        {
            domains: ["acme.com"],
            paths: ["/", "/a", "/b", "/c", "/d", "/e"],
        },
    ];
    for (const bad of badInputs) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: bad },
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    assertEquals(
        await estimateEndpoint(unit, {
            body: {
                domains: ["acme.com", "acme.com", "beta.com"],
                paths: ["/", "/a", "/b", "/c", "/d"],
            },
        }),
        { credits: { default: 0.02 }, evidence: { RESULT: 2 } },
    );
});

Deno.test({
    name: `${ID} live (gated on DEALPORT_API_KEY)`,
    ignore: liveSkip("dealport"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { domains: ["dealport.com"] } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, Json>;
        const data = output.data as Record<string, Json>;
        assertEquals("cost_usd" in output, false);
        assertEquals(Array.isArray(data.items), true);
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
    },
});
