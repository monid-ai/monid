import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("askbots#bot-profiles/me/ratings synthetic-rated: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("askbots#bot-profiles/me/ratings");
    const fixture = await loadFixture(`${fixturesDir}synthetic-rated.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("askbots#bot-profiles/me/ratings synthetic-unrated: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("askbots#bot-profiles/me/ratings");
    const fixture = await loadFixture(`${fixturesDir}synthetic-unrated.json`);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});
