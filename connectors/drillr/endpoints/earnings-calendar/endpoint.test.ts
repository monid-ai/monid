import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("drillr#earnings-calendar happy (recorded): a date window returns announcements; flat 0.02 credits", async () => {
    const unit = await testSealedUnit("drillr#earnings-calendar");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                from: "2026-11-02",
                to: "2026-11-06",
                limit: 3,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // drillr reports no meter: the pinned flat line is the whole settle
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { CALL: 1 },
    });
    const output = result.output as { data: Record<string, unknown>[] };
    assertEquals(output.data[0].date, "2026-11-02");
    assertEquals(output.data[0].eps_actual, 0.12);
});

Deno.test("drillr#earnings-calendar provider error (synthetic 429): data, zero usage", async () => {
    const unit = await testSealedUnit("drillr#earnings-calendar");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                from: "2026-11-02",
                to: "2026-11-06",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).error,
        "rate_limit_exceeded",
    );
});

Deno.test({
    name: "drillr#earnings-calendar live (gated on DRILLR_API_KEY)",
    ignore: liveSkip("drillr"),
    fn: async () => {
        const unit = await testSealedUnit("drillr#earnings-calendar");
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    from: "2026-11-02",
                    to: "2026-11-06",
                    limit: 3,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, {
            credits: { default: 0.02 },
            evidence: { CALL: 1 },
        });
    },
});
