import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("glyphcall#phishing/check happy (synthetic): block verdict, $0.002", async () => {
    const unit = await testSealedUnit("glyphcall#phishing/check");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-phishing-check-block.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: "https://login.opensea.support/claim" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.002 },
        evidence: { CALL: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.verdict, "block");
    assertEquals(output.matchedOn, "opensea.support");
});

Deno.test("glyphcall#phishing/check: an unknown key is answered 402 (a provider error, billed nothing)", async () => {
    const unit = await testSealedUnit("glyphcall#phishing/check");
    const fixture = await loadFixture(
        `${fixturesDir}unauthorized-phishing-check.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: "github.com" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "Payment required",
    );
});
