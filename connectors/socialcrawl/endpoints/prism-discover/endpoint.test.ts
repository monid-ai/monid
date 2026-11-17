import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "socialcrawl#v1/prism/discover";

const firstCall = {
    query: "electric cars",
    context: "What do women over 50 say about owning an electric car?",
    depth: "quick",
    period: "90d",
};

Deno.test("socialcrawl#v1/prism/discover happy: the documented 8-credit run settles on credits_used", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: firstCall },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // The hold for a call that omits max_credits is the default cap of
    // 50. The receipt says 8, and that claim wins with no mismatch
    // because the evidence counted the same 8.
    assertEquals(result.usage, {
        credits: { default: 8 },
        evidence: { CREDIT: 8 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_used" in output, false);
    assertEquals("credits_remaining" in output, false);
    const data = output.data as {
        items: { id: string }[];
        run: { status: string; credits: { spent: number } };
    };
    assertEquals(data.items.length, 1);
    assertEquals(data.items[0].id, "nw_akd38616exek");
    assertEquals(data.run.status, "completed");
    assertEquals(data.run.credits.spent, 8);
});

Deno.test("socialcrawl#v1/prism/discover: the hold is max_credits, default 50", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        (await estimateEndpoint(unit, { queryParams: firstCall })).credits,
        { default: 50 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { ...firstCall, max_credits: 8 },
        })).credits,
        { default: 8 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { ...firstCall, dry_run: true },
        })).credits,
        {},
    );
});

Deno.test("socialcrawl#v1/prism/discover: schema gate", async () => {
    const unit = await testSealedUnit(ID);
    await assertRejects(
        () =>
            estimateEndpoint(unit, {
                queryParams: { ...firstCall, max_credits: 0 },
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            estimateEndpoint(unit, {
                queryParams: { ...firstCall, depth: "fast" },
            }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { ...firstCall, max_credits: 8 },
        })).credits,
        { default: 8 },
    );
});

Deno.test("socialcrawl#v1/prism/discover provider error: 402 is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: firstCall },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        ),
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { code: string }).code,
        "INSUFFICIENT_CREDITS",
    );
});

Deno.test({
    name: "socialcrawl#v1/prism/discover live (gated on SOCIALCRAWL_API_KEY)",
    ignore: liveSkip("socialcrawl"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    ...firstCall,
                    max_credits: 20,
                    dry_run: true,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // A dry run is free. credits_used 0 prunes the claim, and the
        // evidence fold is zero too.
        assertEquals(result.usage.credits, {});
    },
});
