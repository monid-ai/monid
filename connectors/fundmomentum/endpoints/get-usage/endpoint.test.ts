import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("fixtures/", import.meta.url));

Deno.test("fundmomentum#mcp/get_usage happy (real recording): no args, always free", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/get_usage");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.tier, "pro");
    assertEquals(output.counts_against_quota, false);
    // the MCP envelope and its billing bookkeeping never reach the caller
    assertEquals("content" in output, false);
    assertEquals("_meta" in output, false);
});
