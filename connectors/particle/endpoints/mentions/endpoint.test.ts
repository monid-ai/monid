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
const ID = "particle#v1/podcasts/mentions";
const INPUT = { queryParams: { company_id: "nvidia.com", limit: 2 } };

Deno.test(`${ID} happy (recorded): $0.015 flat, episode groups ride through`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy-mentions.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.015 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assert(Array.isArray(output.data));
    assertEquals((output.data as unknown[]).length, 2);
    assertEquals(typeof output.has_more, "boolean");
    assertEquals(
        (await estimateEndpoint(unit, INPUT)).credits,
        { default: 0.015 },
    );
});

Deno.test(`${ID} unauthorized (recorded 401): digested data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}unauthorized-mentions.json`,
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

Deno.test(`${ID}: the gate — bounds, enums, booleans, unknown keys`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy-mentions.json`);
    const rejected: Record<string, Json>[] = [
        { company_id: "" },
        { company_id: "nvidia.com", guest_field: "x".repeat(201) },
        { company_id: "nvidia.com", limit: 0 },
        { company_id: "nvidia.com", context_lines: 21 },
        { company_id: "nvidia.com", sort: "newest" },
        { company_id: "nvidia.com", include_ads: "true" },
        { company_id: "nvidia.com", bogus: 1 },
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
        { entity_id: "sam-altman", role: "mention", context_lines: 0 },
        {
            company_id: "nvidia.com",
            podcast_id: "all-in",
            include_ads: true,
            since: "2026-01-01",
            sort: "strength",
            guest_seniority: "senior",
            limit: 100,
        },
        // the cross-field rule (one of entity_id / company_id) is the
        // vendor's to enforce — the schema lets an empty query through
        {},
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
            input: { queryParams: { company_id: "nvidia.com", limit: 1 } },
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
