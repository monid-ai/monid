import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("podwise#podcasts/episodes happy: free, isRead is dropped", async () => {
    const unit = await testSealedUnit("podwise#podcasts/episodes");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { seq: "1396" },
            queryParams: { date: "2026-11-17", days: 60 },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const episodes = (result.output as { result: Record<string, unknown>[] })
        .result;
    assertEquals(
        episodes.map((episode) => [episode.seq, episode.transcribed]),
        [[9480205, true], [9466192, true]],
    );
    // the recorded response carries isRead (the token owner's reading
    // state); the caller must never see it
    assertEquals(episodes.some((episode) => "isRead" in episode), false);
});

Deno.test("podwise#podcasts/episodes unknown podcast: 404 is data, zero usage", async () => {
    const unit = await testSealedUnit("podwise#podcasts/episodes");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { seq: "999999999" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        success: false,
        error: "not_found",
        message: "Podcast not found",
    });
});
