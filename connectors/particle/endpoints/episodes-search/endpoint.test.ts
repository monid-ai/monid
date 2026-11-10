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
const ID = "particle#v1/podcasts/episodes/search";
const INPUT = {
    queryParams: { semantic_search: "the future of AI agents", limit: 2 },
};

Deno.test(`${ID} happy (recorded): $0.01 flat, segments ride through`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}happy-episodes-search.json`,
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
        `${fixturesDir}unauthorized-episodes-search.json`,
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

Deno.test(`${ID}: the gate — context and limit bounds, enums, unknown keys`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}happy-episodes-search.json`,
    );
    const rejected: Record<string, Json>[] = [
        { semantic_search: "" },
        { semantic_search: "x".repeat(501) },
        { semantic_search: "ai agents", context: 0 },
        { semantic_search: "ai agents", context: 16 },
        { semantic_search: "ai agents", limit: 101 },
        { semantic_search: "ai agents", format: "tiny" },
        { semantic_search: "ai agents", guest_capacity: "founder" },
        { semantic_search: "ai agents", guest_practicing: "yes" },
        {
            semantic_search: "ai agents",
            "speaker_statement_characteristics[sentiment]": "negative",
        },
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
    const accepted: Record<string, Json>[] = [
        { keyword_search: '"interest rates"', keyword_match: "ranked" },
        {
            semantic_search: "drug pricing reform",
            guest_occupation: "physicians",
            guest_standing: "established",
            guest_practicing: true,
            format: "compact",
            limit: 100,
        },
        {
            semantic_search: "chip export controls",
            company_id: "nvidia.com",
            podcast_id: "all-in",
            since: "2026-01-01",
            context: 15,
        },
    ];
    for (const queryParams of accepted) {
        await assertInputAccepted({
            unit,
            input: { queryParams },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test({
    name: `${ID} live (gated on PARTICLE_API_KEY)`,
    ignore: liveSkip("particle"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: {
                    semantic_search: "the future of AI agents",
                    format: "compact",
                    limit: 1,
                },
            },
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
