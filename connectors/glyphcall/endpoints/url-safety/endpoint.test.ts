import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const input = { "url": "http://github.com" };

Deno.test("glyphcall#pack/url-safety happy (synthetic): the whole answer passes through, $0.01", async () => {
    const unit = await testSealedUnit("glyphcall#pack/url-safety");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-url-safety.json`,
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
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("glyphcall#pack/url-safety provider error (isProviderError true, empty usage)", async () => {
    const unit = await testSealedUnit("glyphcall#pack/url-safety");
    const fixture = await loadFixture(
        `${fixturesDir}provider-error-url-safety.json`,
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

Deno.test("glyphcall#pack/url-safety input gate: a near-valid bad input is INVALID_INPUT, its near-twin passes", async () => {
    const unit = await testSealedUnit("glyphcall#pack/url-safety");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-url-safety.json`,
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
            input: { queryParams: { "url": "http://example.org" } },
            mode: "replay",
            fixture,
        })
    );
    assert(
        !String((error as Error).message).includes("INVALID_INPUT"),
        String(error),
    );
});

Deno.test("glyphcall#pack/url-safety input gate: the scheme check is case-insensitive in the compiled schema, and non-http schemes are refused", async () => {
    const unit = await testSealedUnit("glyphcall#pack/url-safety");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-url-safety.json`,
    );
    // an uppercase scheme passes the compiled input gate and fails only later, at replay URL matching
    for (const url of ["HTTPS://example.org", "Http://example.org"]) {
        const error = await assertRejects(() =>
            runEndpoint({
                unit,
                input: { queryParams: { url } },
                mode: "replay",
                fixture,
            })
        );
        assert(
            !String((error as Error).message).includes("INVALID_INPUT"),
            `${url}: ${String(error)}`,
        );
    }
    for (const url of ["ftp://example.org", "javascript:alert(1)"]) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams: { url } },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test({
    name: "glyphcall#pack/url-safety live (gated on GLYPHCALL credentials)",
    ignore: liveSkip("glyphcall"),
    fn: async () => {
        const unit = await testSealedUnit("glyphcall#pack/url-safety");
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
        for (const key of ["pack", "url", "finalUrl", "risk"]) {
            assert(key in output, key);
        }
    },
});
