import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("podwise#podcasts/search happy: free, show seqs come back", async () => {
    const unit = await testSealedUnit("podwise#podcasts/search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "Dwarkesh Podcast", hitsPerPage: 3 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const shows = (result.output as { result: { seq: number; name: string }[] })
        .result;
    // the same show twice, one per feed — what the endpoint note warns about
    assertEquals(shows.map((show) => [show.seq, show.name]), [
        [14583, "Dwarkesh Podcast"],
        [1396, "Dwarkesh Podcast"],
    ]);
});
