import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
type Gate = {
    pathParams: Record<string, string>;
    queryParams?: Record<string, Json>;
};
const ID = "particle#v1/podcasts/{id}/episodes";
const INPUT = { pathParams: { id: "all-in" }, queryParams: { limit: 2 } };

Deno.test(`${ID} happy (recorded): $0.01 flat, the page rides through`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}happy-podcast-episodes.json`,
    );
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
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assert(Array.isArray(output.data));
    assertEquals((output.data as unknown[]).length, 2);
    assertEquals(typeof output.has_more, "boolean");
    assertEquals(
        (await estimateEndpoint(unit, INPUT)).credits,
        { default: 0.01 },
    );
});

Deno.test(`${ID} unauthorized (recorded 401): digested data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}unauthorized-podcast-episodes.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: the gate — id, limit bounds, transcript_status enum`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}happy-podcast-episodes.json`,
    );
    const gateInputs: Gate[] = [
        { pathParams: { id: "" } },
        { pathParams: { id: "all-in" }, queryParams: { q: "x".repeat(201) } },
        { pathParams: { id: "all-in" }, queryParams: { limit: 0 } },
        {
            pathParams: { id: "all-in" },
            queryParams: { transcript_status: "pending" },
        },
        {
            pathParams: { id: "all-in" },
            queryParams: { published_after: "2026-01-01" },
        },
    ];
    for (const input of gateInputs) {
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(input),
        );
    }
    await assertInputAccepted({
        unit,
        input: {
            pathParams: { id: "all-in" },
            queryParams: {
                q: "nvidia",
                since: "2026-01-01",
                transcript_status: "transcribed",
                limit: 100,
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: `${ID} live (gated on PARTICLE_API_KEY)`,
    ignore: liveSkip("particle"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { id: "all-in" }, queryParams: { limit: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
        assertEquals(typeof result.usage.credits.default, "number");
        assert(
            ((result.output as Record<string, unknown>).data as unknown[])
                .length > 0,
            "live page carries results",
        );
        assert(Array.isArray((result.output as Record<string, unknown>).data));
    },
});
