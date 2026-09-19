import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "zensched#feedback-submit";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        title: "Surface pet-care kits in Monid discover",
        body: "Would love Monid discover to surface pet-care reference-design kits.",
        category: "feature",
    },
};

Deno.test(`${ID} happy (synthetic): free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    assertEquals(fixture.calls.length, 1);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "open");
    assertEquals(output.category, "feature");
    assertEquals("billing" in output, false);
});

Deno.test(`${ID} provider error (synthetic 503): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 503);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: title and body required, category enum, strict body`, async () => {
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
            { title: "hello" },
            { body: "hello" },
            { title: "", body: "hello" },
            { title: "hello", body: "" },
            { title: "hello", body: "world", category: "not-a-category" },
            { title: "hello", body: "world", unknown: true },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    const result = await run({
        title: "Monid schema gate valid optional context",
        body: "Optional context is allowed on feedback_submit.",
        context: "optional context is allowed",
    });
    assertEquals(result.isProviderError, false);
});

Deno.test({
    name:
        `${ID} live (gated on ZENSCHED_API_KEY — public funnel, key unused on wire)`,
    ignore: liveSkip("zensched"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    title: `Monid live test ${Date.now()}`,
                    body: "Automated Monid connector live test.",
                    category: "docs",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assertEquals(output.status, "open");
        assert(typeof output.feedback_id === "number");
        assertEquals("billing" in output, false);
    },
});
