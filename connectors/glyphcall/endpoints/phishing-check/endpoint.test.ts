import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const input = { "url": "https://github.com" };

Deno.test("glyphcall#phishing/check happy (synthetic): the whole answer passes through, $0.002", async () => {
    const unit = await testSealedUnit("glyphcall#phishing/check");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-phishing-check.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: input },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.002 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("glyphcall#phishing/check provider error (isProviderError true, empty usage)", async () => {
    const unit = await testSealedUnit("glyphcall#phishing/check");
    const fixture = await loadFixture(
        `${fixturesDir}provider-error-phishing-check.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: input },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "Payment required",
    );
});

Deno.test("glyphcall#phishing/check input gate: a near-valid bad input is INVALID_INPUT, its near-twin passes", async () => {
    const unit = await testSealedUnit("glyphcall#phishing/check");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-phishing-check.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { "url": 12345 } as never },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the near-twin passes the schema and fails only later, at replay URL matching
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { queryParams: { "url": "example.org" } },
            mode: "replay",
            fixture,
        })
    );
    assert(
        !String((error as Error).message).includes("INVALID_INPUT"),
        String(error),
    );
});

Deno.test("glyphcall#phishing/check: a host on a blocklist returns verdict block", async () => {
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
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test({
    name: "glyphcall#phishing/check live (gated on GLYPHCALL credentials)",
    ignore: liveSkip("glyphcall"),
    fn: async () => {
        const unit = await testSealedUnit("glyphcall#phishing/check");
        const result = await runEndpoint({
            unit,
            input: { queryParams: input },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        for (const key of ["url", "domain", "verdict", "listed"]) {
            assert(key in output, key);
        }
    },
});
