import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "velabreakout#rising-companies";

Deno.test("velabreakout#rising-companies happy (synthetic): limit on the wire; $0.02; companies relayed", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-rising-companies-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { RESULT: 1 },
    });
    const output = result.output as Record<string, Json>;
    assertEquals("billing" in output, false);
    const companies = output.companies as Record<string, Json>[];
    assertEquals(companies.map((c) => c.domain), [
        "context7.com",
        "stepfun.com",
        "poolside.ai",
    ]);
    assertEquals(companies[1].rising_on, [
        "Model tokens",
        "Open model pull",
        "Forum points",
        "Web reach",
    ]);
});

Deno.test("velabreakout#rising-companies empty companies (synthetic 200): free, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-rising-companies-empty.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
    assertEquals((result.output as Record<string, Json>).companies, []);
});

Deno.test("velabreakout#rising-companies 401 (synthetic): data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-unauthorized.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: {} },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("velabreakout#rising-companies: limit bounded; unknown keys rejected", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-rising-companies-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        { limit: 0 },
        { limit: 26 },
        { limit: 2.5 },
        { group: "ai_apps" },
    ];
    for (const queryParams of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(queryParams),
        );
    } // the accepted twins of the rejected limits above
    for (const limit of [1, 25]) {
        assertEquals(
            await estimateEndpoint(unit, { queryParams: { limit } }),
            { credits: { default: 0.02 }, evidence: { RESULT: 1 } },
            String(limit),
        );
    }
});

Deno.test({
    name:
        "velabreakout#rising-companies live (gated on VELABREAKOUT_CREDENTIALS_API_KEY)",
    ignore: liveSkip("velabreakout"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { limit: 3 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: `companies: []` is a valid, free 200
        const output = result.output as Record<string, Json>;
        assertEquals(Array.isArray(output.companies), true);
    },
});
