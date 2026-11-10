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
const ID = "particle#v1/entities/search";
const INPUT = { queryParams: { q: "nvidia", limit: 2 } };

Deno.test(`${ID} happy (recorded): $0.003 flat, matches ride through`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}happy-entities-search.json`,
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
        credits: { default: 0.003 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assert(Array.isArray(output.data));
    assertEquals((output.data as unknown[]).length, 2);
    // a result is {type, match_quality, ...} with the matched record nested
    // under its type key (`company`, `person`, `knowledge_graph_entity`);
    // the slug the other endpoints take lives on that nested record
    const first = (output.data as Record<string, unknown>[])[0];
    assertEquals(typeof first.match_quality, "string");
    const kind = first.type as string;
    assert(["person", "company", "knowledge_graph_entity"].includes(kind));
    const record = first[kind] as Record<string, unknown>;
    assertEquals(typeof record.slug, "string");
    assertEquals(
        (await estimateEndpoint(unit, INPUT)).credits,
        { default: 0.003 },
    );
});

Deno.test(`${ID} unauthorized (recorded 401): digested data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}unauthorized-entities-search.json`,
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

Deno.test(`${ID}: the gate — q required, type enum, limit bounds`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}happy-entities-search.json`,
    );
    const rejected: Record<string, Json>[] = [
        {},
        { q: "" },
        { q: "nvidia", type: "ticker" },
        { q: "nvidia", limit: 101 },
        { q: "nvidia", extra: true },
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
    const acceptedParams: Record<string, Json>[] = [
        { q: "AAPL", type: "company" },
        { q: "@sama", type: "person", limit: 1 },
    ];
    for (const queryParams of acceptedParams) {
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
            input: { queryParams: { q: "nvidia", type: "company", limit: 1 } },
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
