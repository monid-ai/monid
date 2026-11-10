import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const input = { "queryParams": { "query": "FR7630006000011234567890189" } };

Deno.test("veille#v1/vat/iban happy (synthetic): 1 credit; payload rides through", async () => {
    const unit = await testSealedUnit("veille#v1/vat/iban");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-iban-ok.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("veille#v1/vat/iban provider error (synthetic 401): data, zero usage", async () => {
    const unit = await testSealedUnit("veille#v1/vat/iban");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-iban-unauthorized.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("veille#v1/vat/iban: query required; unknown keys rejected", async () => {
    const unit = await testSealedUnit("veille#v1/vat/iban");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-iban-ok.json`,
    );
    const rejected: Record<string, Json>[] = [
        {},
        { "query": "FR7630006000011234567890189", "bogus": 1 },
    ];
    for (const params of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams: params },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(params),
        );
    }
});

Deno.test({
    name: "veille#v1/vat/iban live (gated on VEILLE_API_KEY)",
    ignore: liveSkip("veille"),
    fn: async () => {
        const unit = await testSealedUnit("veille#v1/vat/iban");
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
    },
});
