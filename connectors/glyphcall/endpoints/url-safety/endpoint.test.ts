import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("glyphcall#pack/url-safety happy (synthetic): $0.01 per call", async () => {
    const unit = await testSealedUnit("glyphcall#pack/url-safety");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-url-safety.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { "url": "http://github.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
    assertEquals((result.output as Record<string, unknown>)["risk"], "low");
});
