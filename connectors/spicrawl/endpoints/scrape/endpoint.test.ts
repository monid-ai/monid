import { assert, assertEquals, assertRejects } from "@std/assert";
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
const ID = "spicrawl#scrape";
const url = "https://example.com";

/**
 * Spicrawl's scrape draw, per the vendor credit table
 * (https://docs.spicrawl.com/credits, 2026-11-25): plain fetch 1,
 * `js_render` 3, full-browser (`mode: "auto"` ceiling, or `solve_captcha`) 8,
 * plus a 5-credit captcha solve. Literals on purpose: deriving them from the
 * doc would make this a tautology.
 */
const RATE: [Record<string, unknown>, number][] = [
    [{}, 1],
    [{ js_render: true }, 3],
    [{ mode: "auto" }, 8],
    [{ js_render: true, solve_captcha: true }, 13],
    [{ js_render: true, scroll_pages: 1 }, 8], // scrolling is full-browser
    [{ js_render: true, scroll_pages: 0 }, 3],
    [{ js_render: true, max_cost: 2 }, 2], // max_cost caps the estimate
    [{ mode: "auto", max_cost: 20 }, 8],
    [{ js_render: true, max_cost: 0 }, 3], // 0 means no ceiling
];

Deno.test("spicrawl#scrape happy: `credits` claim wins and leaves the payload", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}scrape-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { url } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits" in output, false);
    assertEquals(output.status, 200);
    assertEquals(typeof output.content, "string");
});

Deno.test("spicrawl#scrape provider error: 401 problem+json is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { url } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("spicrawl#scrape estimate: the literal rate table", async () => {
    const unit = await testSealedUnit(ID);
    for (const [extra, credits] of RATE) {
        const usage = await estimateEndpoint(unit, { body: { url, ...extra } });
        assertEquals(
            usage.credits,
            { default: credits },
            JSON.stringify(extra),
        );
    }
});

Deno.test("spicrawl#scrape: shared-key state (session_id) is rejected, its twin passes", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}scrape-ok.json`);
    const err = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { body: { url, session_id: "abc" } },
            mode: "replay",
            fixture,
        })
    );
    assert(String(err).includes("INVALID_INPUT"), String(err));
    const ftp = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { body: { url: "ftp://example.com" } },
            mode: "replay",
            fixture,
        })
    );
    assert(String(ftp).includes("INVALID_INPUT"), String(ftp));
    await assertInputAccepted({
        unit,
        input: { body: { url, js_render: true, cache: false } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "spicrawl#scrape live (gated on SPICRAWL_API_KEY)",
    ignore: liveSkip("spicrawl"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { url } },
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
