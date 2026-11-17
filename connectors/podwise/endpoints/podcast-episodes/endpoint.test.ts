import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

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
    // the recorded response carries isRead (the token owner's reading
    // state); the caller gets everything else, unchanged
    const expected = structuredClone(fixture.calls[0].res.body);
    for (
        const episode of (expected as { result: Record<string, unknown>[] })
            .result
    ) delete episode.isRead;
    assert(
        (fixture.calls[0].res.body as { result: Record<string, unknown>[] })
            .result.every((episode) => "isRead" in episode),
        "fixture still carries isRead",
    );
    // the whole recorded body comes through: nothing dropped, nothing added
    assertEquals(result.output, expected);
});

Deno.test("podwise#podcasts/episodes provider error (unknown podcast, 404): zero usage", async () => {
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

Deno.test("podwise#podcasts/episodes schema gate: days 1-365, a real calendar date, a decimal seq", async () => {
    const unit = await testSealedUnit("podwise#podcasts/episodes");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const bad: RunInput[] = [
        { pathParams: { seq: "1396" }, queryParams: { days: 366 } },
        { pathParams: { seq: "1396" }, queryParams: { days: 0 } },
        { pathParams: { seq: "1396" }, queryParams: { date: "2026-02-30" } },
        {
            pathParams: { seq: "1396" },
            queryParams: { date: "2026-11-17T00:00" },
        },
        { pathParams: { seq: "13x6" } },
    ];
    for (const input of bad) {
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(input),
        );
    }
    // near-twin: valid, so it passes the schema and fails later, at replay
    // URL matching (it is not the recorded request)
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: {
                pathParams: { seq: "1396" },
                queryParams: { date: "2026-02-28", days: 365 },
            },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test({
    name: "podwise#podcasts/episodes live (gated on PODWISE_API_KEY)",
    ignore: liveSkip("podwise"),
    fn: async () => {
        const unit = await testSealedUnit("podwise#podcasts/episodes");
        const result = await runEndpoint({
            unit,
            input: { pathParams: { seq: "1396" }, queryParams: { days: 30 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as {
            success: boolean;
            result: unknown;
        };
        assertEquals(output.success, true);
        const episodes = output.result as Record<string, unknown>[];
        assert(Array.isArray(episodes), "result is an array");
        for (const episode of episodes) {
            assertEquals(typeof episode.seq, "number");
            assertEquals(typeof episode.transcribed, "boolean");
            assertEquals("isRead" in episode, false);
        }
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
