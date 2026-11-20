import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("loyaltie#get-product happy (recorded 2026-11-17): free, structuredContent returned", async () => {
    const unit = await testSealedUnit("loyaltie#get-product");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    // the wire request is the JSON-RPC tools/call envelope, attributed to Monid
    const req = fixture.calls[0].req as { body?: Record<string, unknown> };
    const params = (req.body as Record<string, unknown>).params as Record<
        string,
        unknown
    >;
    assertEquals((req.body as Record<string, unknown>).method, "tools/call");
    assertEquals(params.name, "get_product");
    const args = params.arguments as Record<string, unknown>;
    assertEquals(args.src, "api");
    assertEquals(args.agent_id, "monid");
    const result = await runEndpoint({
        unit,
        input: {
            body: { catalog: { id: "00036129-287b-43a6-a426-18bd0d9b2f5f" } },
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
    const product = output.product as Record<string, unknown>;
    assertEquals(product.id, "00036129-287b-43a6-a426-18bd0d9b2f5f");
});

Deno.test("loyaltie#get-product not found (recorded 2026-11-17): UCP error message, still free", async () => {
    const unit = await testSealedUnit("loyaltie#get-product");
    const fixture = await loadFixture(`${fixturesDir}not-found.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { catalog: { id: "00000000-0000-0000-0000-000000000000" } },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    const messages = output.messages as Array<Record<string, unknown>>;
    assertEquals(messages[0].code, "not_found");
});
