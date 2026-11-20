import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("loyaltie#search-catalog happy (recorded 2026-11-17): free, structuredContent returned", async () => {
    const unit = await testSealedUnit("loyaltie#search-catalog");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    // the wire request is the JSON-RPC tools/call envelope, attributed to Monid
    const req = fixture.calls[0].req as { body?: Record<string, unknown> };
    const params = (req.body as Record<string, unknown>).params as Record<
        string,
        unknown
    >;
    assertEquals((req.body as Record<string, unknown>).method, "tools/call");
    assertEquals(params.name, "search_catalog");
    const args = params.arguments as Record<string, unknown>;
    assertEquals(args.src, "api");
    assertEquals(args.agent_id, "monid");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                catalog: {
                    query: "pasta",
                    context: { intent: "healthy pasta every month" },
                    filters: { regular_delivery: true },
                    pagination: { limit: 2 },
                },
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // FREE model: nothing billed, nothing evidenced
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assert("ucp" in output, "UCP envelope present");
    assertEquals("jsonrpc" in output, false);
    const products = output.products as Array<Record<string, unknown>>;
    assert(products.length > 0, "products returned");
    assert(
        `${products[0].url}`.includes("agent=monid"),
        "links attributed to Monid",
    );
});
