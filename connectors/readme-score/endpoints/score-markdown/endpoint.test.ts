import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "readme-score#api/score/markdown";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const BODY = {
    readme: "# slugkit\n\nTurn titles into slugs.\n",
    type: "library",
};

Deno.test(`${ID} happy: a report for pasted Markdown, free, no credentials`, async () => {
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
    const output = result.output as Record<string, unknown>;
    assertEquals(output.score, 34);
    assertEquals(output.grade, "F");
    assert(Array.isArray(output.groups));
});

Deno.test(`${ID}: the schema gate — readme is required, type is one of four, nothing else passes`, async () => {
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
});

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
    },
});
