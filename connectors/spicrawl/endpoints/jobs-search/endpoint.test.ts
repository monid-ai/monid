import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "spicrawl#jobs/search";
const body = { title: "backend engineer", limit: 3 };

Deno.test("spicrawl#jobs/search happy: `credits_used` claim wins and leaves the payload", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}jobs-search-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { CREDIT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_used" in output, false);
    assertEquals((output.jobs as unknown[]).length, 2);
});

Deno.test("spicrawl#jobs/search provider error: 401 problem+json is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("spicrawl#jobs/search: find_contacts is rejected, its twin passes", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}jobs-search-ok.json`);
    const err = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { body: { ...body, find_contacts: true } },
            mode: "replay",
            fixture,
        })
    );
    assert(String(err).includes("INVALID_INPUT"), String(err));
    await assertInputAccepted({
        unit,
        input: { body: { ...body, include_description: true } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "spicrawl#jobs/search live (gated on SPICRAWL_API_KEY)",
    ignore: liveSkip("spicrawl"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { title: "backend engineer", limit: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(typeof result.usage.credits.default, "number");
        assert(Array.isArray((result.output as { jobs: unknown }).jobs));
        assert(!("credits_used" in (result.output as Record<string, unknown>)));
    },
});
