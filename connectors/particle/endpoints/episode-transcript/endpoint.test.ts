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
const ID = "particle#v1/podcasts/episodes/{id}/transcript";
// the episode the happy chain was recorded against (an All-In episode,
// 2026-10-28) — see fixtures/happy-episode-transcript.json
const EPISODE = "6bbjvFIPxXcVc1pt00h2y6";
const INPUT = {
    pathParams: { id: EPISODE },
    queryParams: { start: 0, end: 60 },
};

Deno.test(`${ID} happy (recorded): $0.01 flat, the lines ride through`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        unit.doc.request.url,
        "https://api.particle.pro/v1/podcasts/episodes/{id}/transcript",
    );
    const fixture = await loadFixture(
        `${fixturesDir}happy-episode-transcript.json`,
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
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(
        (await estimateEndpoint(unit, INPUT)).credits,
        { default: 0.01 },
    );
});

Deno.test(`${ID} unauthorized (recorded 401): digested data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}unauthorized-episode-transcript.json`,
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

Deno.test(`${ID}: the gate — id required, format enum, unknown keys`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}happy-episode-transcript.json`,
    );
    const gateInputs: Gate[] = [
        { pathParams: { id: "" } },
        { pathParams: { id: EPISODE }, queryParams: { format: "pdf" } },
        { pathParams: { id: EPISODE }, queryParams: { start: "0" } },
        { pathParams: { id: EPISODE }, queryParams: { lines: 10 } },
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
            pathParams: { id: EPISODE },
            queryParams: { format: "srt", speaker: "Chamath", start: 30.5 },
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
            input: {
                pathParams: { id: EPISODE },
                queryParams: { start: 0, end: 30 },
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
        const lines = (result.output as Record<string, unknown>).lines;
        assert(Array.isArray(lines) && lines.length > 0, "transcript lines");
    },
});
