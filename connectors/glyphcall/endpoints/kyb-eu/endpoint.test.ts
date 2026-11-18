import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("glyphcall#pack/kyb-eu happy (synthetic): $0.02 per call", async () => {
    const unit = await testSealedUnit("glyphcall#pack/kyb-eu");
    const fixture = await loadFixture(`${fixturesDir}synthetic-kyb-eu.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { "q": "Spotify" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { CALL: 1 },
    });
});
