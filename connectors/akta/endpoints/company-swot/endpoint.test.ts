import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "akta#v1/company/enrichment/swot/{company}";

Deno.test("akta#v1/company/enrichment/swot/{company} happy (synthetic): flat 0.5-credit card", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { pathParams: { company: "canva.com" } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.5 },
        evidence: { CALL: 1 },
    });
    // the vendor meter is absorbed out of the payload
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
});

Deno.test("akta#v1/company/enrichment/swot/{company} estimate: matches the settled card", async () => {
    const usage = await estimateEndpoint(
        await testSealedUnit(ID),
        { pathParams: { company: "canva.com" } },
    );
    assertEquals(usage, { credits: { default: 0.5 }, evidence: { CALL: 1 } });
});
