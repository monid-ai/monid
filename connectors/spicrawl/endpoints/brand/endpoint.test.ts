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
const ID = "spicrawl#brand";
const body = { url: "https://example.com", include: ["identity", "colors"] };

Deno.test("spicrawl#brand happy (synthetic): `credits` claim wins and leaves the payload", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-brand-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // claim and evidence agree (3), so no mismatch rides out
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { CREDIT: 3 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits" in output, false);
    assertEquals((output.colors as unknown[]).length, 1);
    assertEquals(output.final_url, "https://example.com/");
});

Deno.test("spicrawl#brand provider error: 401 problem+json is data, zero usage", async () => {
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

Deno.test("spicrawl#brand: the body is strict — an unknown key is rejected, its twin passes", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-brand-ok.json`);
    const err = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { body: { ...body, format: "png" } },
            mode: "replay",
            fixture,
        })
    );
    assert(String(err).includes("INVALID_INPUT"), String(err));
    await assertInputAccepted({
        unit,
        input: { body: { ...body, screenshot: true } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "spicrawl#brand live (gated on SPICRAWL_API_KEY)",
    ignore: liveSkip("spicrawl"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { url: "https://example.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(typeof result.usage.credits.default, "number");
        assert(!("credits" in (result.output as Record<string, unknown>)));
    },
});
