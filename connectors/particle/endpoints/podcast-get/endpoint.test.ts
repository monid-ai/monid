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
const ID = "particle#v1/podcasts/{id}";
const INPUT = { pathParams: { id: "all-in" }, queryParams: { topic_limit: 3 } };

Deno.test(`${ID} happy (recorded): $0.003 flat, the show rides through`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        unit.doc.request.url,
        "https://api.particle.pro/v1/podcasts/{id}",
    );
    const fixture = await loadFixture(`${fixturesDir}happy-podcast-get.json`);
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
    assertEquals(output.slug, "all-in");
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(typeof output.title, "string");
    assertEquals(
        (await estimateEndpoint(unit, INPUT)).credits,
        { default: 0.003 },
    );
});

Deno.test(`${ID} unauthorized (recorded 401): digested data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}unauthorized-podcast-get.json`,
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
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "api_key_required",
    );
});

Deno.test(`${ID}: the gate — empty id, topic_limit bounds, unknown keys`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy-podcast-get.json`);
    const gateInputs: Gate[] = [
        { pathParams: { id: "" } },
        { pathParams: { id: "all-in" }, queryParams: { topic_limit: -1 } },
        {
            pathParams: { id: "all-in" },
            queryParams: { topic_limit: 1001 },
        },
        { pathParams: { id: "all-in" }, queryParams: { bogus: "x" } },
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
            pathParams: { id: "lex-fridman-podcast" },
            queryParams: { include: "related,coverage", topic_limit: 0 },
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
                pathParams: { id: "all-in" },
                queryParams: { topic_limit: 1 },
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
            typeof (result.output as Record<string, unknown>).slug === "string",
        );
    },
});
