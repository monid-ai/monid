import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "akta#v1/company/enrichment/logo/{company}";

Deno.test("akta#v1/company/enrichment/logo/{company} happy (synthetic): FREE: a present zero claim prunes, nothing folds", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { pathParams: { company: "canva.com" } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // the vendor meter is absorbed out of the payload
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
});

Deno.test("akta#v1/company/enrichment/logo/{company} estimate: matches the settled card", async () => {
    const usage = await estimateEndpoint(
        await testSealedUnit(ID),
        { pathParams: { company: "canva.com" } },
    );
    assertEquals(usage, { credits: {}, evidence: {} });
});
