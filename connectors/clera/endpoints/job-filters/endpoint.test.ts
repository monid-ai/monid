import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("clera#job-filters happy (recorded 2026-11-09): unwrapped facets, free", async () => {
    const unit = await testSealedUnit("clera#job-filters");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        result.output,
        (fixture.calls[0].res.body as { data: unknown }).data,
    );
});
