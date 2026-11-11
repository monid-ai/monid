import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "readme-score#api/score";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy: a report, free, no credentials`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { repo: "flisk-sh/readme-score" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.score, 98);
    assertEquals(output.grade, "A");
    assert(Array.isArray(output.groups));
});

Deno.test(`${ID} provider error: a 404 is data, zero usage, body untouched`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { repo: "nonexistent-zz/none-zz" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        error: "nonexistent-zz/none-zz is not a public GitHub repository.",
    });
});

Deno.test(`${ID}: the schema gate — repo is required, type is one of four, nothing else passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const run = (input: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { queryParams: input as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { repo: "" },
            { repo: "flisk-sh/readme-score", type: "game" },
            { repo: "flisk-sh/readme-score", extra: "x" },
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
            input: { queryParams: { repo: "flisk-sh/readme-score" } },
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
