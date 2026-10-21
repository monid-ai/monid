import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "akta#v1/company/posts";

Deno.test("akta#v1/company/posts happy (synthetic): two delivered posts start one 10-record block of 1 credit", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { queryParams: { company: "canva.com", limit: 2 } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 2 },
    });
    // the vendor meter is absorbed out of the payload
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
});

Deno.test("akta#v1/company/posts estimate: matches the settled card", async () => {
    const usage = await estimateEndpoint(
        await testSealedUnit(ID),
        { queryParams: { company: "canva.com", limit: 2 } },
    );
    assertEquals(usage, { credits: { default: 1 }, evidence: { RESULT: 2 } });
});
