import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "particle#v1/podcasts/search";
const INPUT = { queryParams: { q: "all-in", limit: 2 } };

Deno.test("particle: seven GET docs, one auth fn, one USD pool, flat PER_CALL, no consolidate", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("particle#")
    ).sort();
    // pinned from particle.pro/pricing, Endpoint List Prices, Individual column, 2026-10-29
    const prices: Record<string, number> = {
        "particle#v1/entities/search": 0.003,
        "particle#v1/podcasts/episodes/search": 0.01,
        "particle#v1/podcasts/episodes/{id}/transcript": 0.01,
        "particle#v1/podcasts/mentions": 0.015,
        "particle#v1/podcasts/search": 0.003,
        "particle#v1/podcasts/{id}": 0.003,
        "particle#v1/podcasts/{id}/episodes": 0.01,
    };
    assertEquals(ids, Object.keys(prices).sort());

    const search = bundle.endpoints[ID];
    assertEquals(
        search.request.url,
        "https://api.particle.pro/v1/podcasts/search",
    );
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.request.method, "GET", id);
        assert(doc.request.url.startsWith("https://api.particle.pro/v1/"), id);
        // provider-shared auth (content addressing at work)
        assertEquals(doc.auth.inject.$fn.key, search.auth.inject.$fn.key, id);
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(Object.keys(doc.usage.credits), ["default"], id);
        const model = doc.usage.model;
        assertEquals(model.kind, "PER_CALL", id);
        assertEquals(
            "consumes" in model ? model.consumes : undefined,
            { credit: "default", amount: prices[id] },
            id,
        );
        // flat PER_CALL: compiler-synthesized empty quantities; the engine
        // appends CALL at estimate and settle
        assertEquals(
            bundle.fnTable[doc.usage.evidence.$fn.key].provenance,
            "core#usage.synthesizedEmpty",
            id,
        );
        assertEquals(doc.meta.categories, ["podcasts"], id);
    }
});

Deno.test(`${ID} happy (recorded): $0.003 flat, the page rides through`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}happy-podcasts-search.json`,
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
    assert(Array.isArray(output.data), "data array present");
    assertEquals((output.data as unknown[]).length, 2);
    assertEquals(typeof output.has_more, "boolean");
    const first = (output.data as Record<string, unknown>[])[0];
    assertEquals(typeof first.slug, "string");
    assertEquals(
        (await estimateEndpoint(unit, INPUT)).credits,
        { default: 0.003 },
    );
});

Deno.test(`${ID} unauthorized (recorded 401): problem+json digested, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}unauthorized-podcasts-search.json`,
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
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "api_key_required");
    assertEquals(typeof output.message, "string");
    assertEquals(typeof output.resolve, "string");
    assertEquals((output.raw as Record<string, unknown>).status, 401);
});

Deno.test(`${ID}: the schema gate — bounds, enums, unknown keys`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}happy-podcasts-search.json`,
    );
    const rejected: Record<string, Json>[] = [
        { q: "" },
        { q: "x".repeat(201) },
        { q: "all-in", min_avg_episode_minutes: -1 },
        { q: "all-in", max_avg_episode_minutes: 10081 },
        { q: "all-in", guest_occupation: "x".repeat(201) },
        { q: "all-in", limit: 0 },
        { q: "all-in", limit: 101 },
        { q: "all-in", popularity_threshold: 1.5 },
        { q: "all-in", sort: "newest" },
        { q: "all-in", has_ads: true },
        { q: "all-in", bogus: 1 },
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
        {},
        { sort: "popularity", limit: 100 },
        { q: "acquired", language: "en", publishing_status: "active" },
        { q: "all-in", guest_frequency: "regular,always", has_ads: "true" },
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
            input: { queryParams: { q: "all-in", limit: 1 } },
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
