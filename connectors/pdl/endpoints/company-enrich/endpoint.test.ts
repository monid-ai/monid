import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("pdl#v5/company/enrich happy (synthetic): flat envelope (no data wrapper); one company_enrich credit", async () => {
    const unit = await testSealedUnit("pdl#v5/company/enrich");
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { website: ["stripe.com"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { company_enrich: 1 },
        evidence: { CALL: 1 },
    });
    // PDL's company record sits at the top level beside status/likelihood
    const output = result.output as Record<string, unknown>;
    assertEquals(output.likelihood, 10);
    assertEquals(output.name, "stripe");
    assertEquals("data" in output, false);
});

Deno.test("pdl#v5/company/enrich provider error (synthetic 404): no match is data, zero usage", async () => {
    const unit = await testSealedUnit("pdl#v5/company/enrich");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { website: ["nonexistent-xyz.com"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    // PDL charges per match, never per miss — the flat CALL line is not
    // appended on a vendor error
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, Record<string, unknown>>).error.type,
        "not_found",
    );
});

Deno.test({
    name: "pdl#v5/company/enrich live (gated on PDL_API_KEY)",
    ignore: liveSkip("pdl"),
    fn: async () => {
        const unit = await testSealedUnit("pdl#v5/company/enrich");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { website: ["stripe.com"] } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: one CALL line, numeric
        assertEquals(Object.keys(result.usage.evidence), ["CALL"]);
        assertEquals(typeof result.usage.evidence.CALL, "number");
    },
});
