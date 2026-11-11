import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "readme-score#api/score/markdown";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const BODY = {
    readme: "# slugkit\n\nTurn titles into slugs.\n",
    type: "library",
};

Deno.test(`${ID} happy: the whole report for pasted Markdown, free, no credentials`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: BODY },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID}: the schema gate — readme is required, type is one of four, and a valid body passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const run = (body: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { body: body as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { readme: "" },
            { readme: "# x", type: "game" },
            { readme: "# x", extra: "x" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin: `type` and `website` together clear the gate (the run
    // then misses the replay body, which is the point: validation let it through)
    await assertInputAccepted({
        unit,
        input: {
            body: {
                readme: "# x",
                type: "api",
                website: "https://example.com",
            },
        },
        mode: "replay",
        fixture,
    });
});

// liveSkip("readme-score", []) is always true (it opens only when every
// declared credential field is set, and this provider has none), so a keyless
// provider gates its live test on an explicit variable instead.
Deno.test({
    name: `${ID} live (no key needed; set README_SCORE_LIVE=1 to run)`,
    ignore: Deno.env.get("README_SCORE_LIVE") !== "1",
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: BODY },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        // shape, never values: a live README's score moves
        const report = result.output as Record<string, unknown>;
        assertEquals(typeof report.score, "number");
        assertEquals(typeof report.grade, "string");
        assert(Array.isArray(report.groups));
    },
});
