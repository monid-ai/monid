import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("glyphcall#sanctions/check happy (synthetic): $0.009 per call", async () => {
    const unit = await testSealedUnit("glyphcall#sanctions/check");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-sanctions-check.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                "address": "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.009 },
        evidence: { CALL: 1 },
    });
});
