import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "vela-breakout#company";

Deno.test("vela-breakout#company happy (synthetic): domain rides the query string; $0.01; signals relayed", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-company-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { name_or_domain: "supabase.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, Json>;
    assertEquals(output.name, "Supabase");
    assertEquals(output.domain, "supabase.com");
    const signals = output.signals as Record<string, Json>[];
    assertEquals(signals.length, 4);
    assertEquals(signals[0].unit, "installs");
});

Deno.test("vela-breakout#company unknown company (synthetic 404): data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-company-not-found.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { name_or_domain: "nobody-here-zz" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Json>).error,
        'No company called "nobody-here-zz" in today\'s data. Try its web domain.',
    );
});

Deno.test("vela-breakout#company: name_or_domain required, 2-120 chars, unknown keys rejected", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-company-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        {},
        { name_or_domain: "x" },
        { name_or_domain: "x".repeat(121) },
        { name_or_domain: "supabase.com", domain: "supabase.com" },
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
    }
});

Deno.test({
    name: "vela-breakout#company live (gated on VELA_BREAKOUT_API_KEY)",
    ignore: liveSkip("vela-breakout"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { name_or_domain: "supabase.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
    },
});
