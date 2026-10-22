import { assertAlmostEquals, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "akta#v1/list/generate/companies";

Deno.test("akta#v1/list/generate/companies happy (synthetic): 1.5 base + 0.2 per delivered company", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: { filters: { "industry.industry": ["IND123"] }, limit: 2 },
        },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1.9 },
        evidence: { company: 2, request: 1 },
    });
    // the vendor meter is absorbed out of the payload
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
});

Deno.test("akta#v1/list/generate/companies estimate: the caller-stated quantity at the published card", async () => {
    const usage = await estimateEndpoint(
        await testSealedUnit(ID),
        {
            body: { filters: { "industry.industry": ["IND123"] }, limit: 2 },
        },
    );
    const expected = {
        credits: { default: 1.9 },
        evidence: { company: 2, request: 1 },
    };
    assertEquals(usage.evidence, expected.evidence);
    // the fold may carry float dust the literal does not
    assertAlmostEquals(usage.credits.default ?? 0, expected.credits.default);
});
