import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const input = { "orgnr": "556703-7485" };

Deno.test("glyphcall#se/company happy (synthetic): the whole answer passes through, $0.01", async () => {
    const unit = await testSealedUnit("glyphcall#se/company");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-se-company.json`,
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

Deno.test("glyphcall#se/company provider error (isProviderError true, empty usage)", async () => {
    const unit = await testSealedUnit("glyphcall#se/company");
    const fixture = await loadFixture(
        `${fixturesDir}provider-error-se-company.json`,
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

Deno.test("glyphcall#se/company input gate: a near-valid bad input is INVALID_INPUT, its near-twin passes", async () => {
    const unit = await testSealedUnit("glyphcall#se/company");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-se-company.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    queryParams: { "name": "Spotify", "limit": 11 } as never,
                },
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
            input: { queryParams: { "name": "Spotify", "limit": 10 } },
            mode: "replay",
            fixture,
        })
    );
    assert(
        !String((error as Error).message).includes("INVALID_INPUT"),
        String(error),
    );
});

Deno.test("glyphcall#se/company input gate: no selector at all is INVALID_INPUT", async () => {
    const unit = await testSealedUnit("glyphcall#se/company");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-se-company.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: {} as never },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: "glyphcall#se/company live (gated on GLYPHCALL credentials)",
    ignore: liveSkip("glyphcall"),
    fn: async () => {
        const unit = await testSealedUnit("glyphcall#se/company");
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
        for (const key of ["orgnr", "vatNumber", "name", "otherNames"]) {
            assert(key in output, key);
        }
    },
});
