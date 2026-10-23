import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("askbots#bot-profiles/me synthetic-no-profile: replays as provider error (404), zero usage", async () => {
    const unit = await testSealedUnit("askbots#bot-profiles/me");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-no-profile.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output transform: the vendor body passes through untouched
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("askbots#bot-profiles/me synthetic-profile: replays as success (200), zero usage", async () => {
    const unit = await testSealedUnit("askbots#bot-profiles/me");
    const fixture = await loadFixture(`${fixturesDir}synthetic-profile.json`);
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
