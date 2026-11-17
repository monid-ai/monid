import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("podwise#episodes/info happy: free, metadata passes through", async () => {
    const unit = await testSealedUnit("podwise#episodes/info");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { seq: "9480205" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const episode = (result.output as { result: Record<string, unknown> })
        .result;
    assertEquals(episode.seq, 9480205);
    assertEquals(episode.podcastName, "Dwarkesh Podcast");
    assertEquals(episode.transcribed, true);
});

Deno.test("podwise#episodes/info unknown seq: 404 is data, zero usage", async () => {
    const unit = await testSealedUnit("podwise#episodes/info");
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
        message: "Episode not found",
    });
});
