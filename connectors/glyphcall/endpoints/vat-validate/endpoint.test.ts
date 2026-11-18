import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("glyphcall#vat/validate happy (synthetic): $0.01 per call", async () => {
    const unit = await testSealedUnit("glyphcall#vat/validate");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-vat-validate.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { "vat": "SE556703748501" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
    assertEquals((result.output as Record<string, unknown>)["valid"], true);
});
