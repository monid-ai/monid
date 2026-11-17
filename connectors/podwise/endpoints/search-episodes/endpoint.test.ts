import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("podwise#episodes/search happy: $0.006 per call, seqs feed the readers", async () => {
    const unit = await testSealedUnit("podwise#episodes/search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "Paul Christiano", hitsPerPage: 3 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.006 },
        evidence: { CALL: 1 },
    });
    const hits = (result.output as { result: { seq: number }[] }).result;
    // the recorder trims arrays to 2; the live call returned 3
    assertEquals(hits.map((hit) => hit.seq), [9480205, 9480370]);
});
