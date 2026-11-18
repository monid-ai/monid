import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("glyphcall#se/company happy (synthetic): $0.01 per call", async () => {
    const unit = await testSealedUnit("glyphcall#se/company");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-se-company.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { "orgnr": "5567037485" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
});
