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
    // the same show twice, one per feed: what the endpoint note warns about
    const shows = (result.output as { result: { seq: number; name: string }[] })
        .result;
    assertEquals(shows.map((show) => [show.seq, show.name]), [
        [14583, "Dwarkesh Podcast"],
        [1396, "Dwarkesh Podcast"],
    ]);
    const expected = fixture.calls[0].res.body;
    // the whole recorded body comes through: nothing dropped, nothing added
    assertEquals(result.output, expected);
});

Deno.test("podwise#podcasts/search provider error (invalid token, 401): zero usage", async () => {
    const unit = await testSealedUnit("podwise#podcasts/search");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { q: "Dwarkesh Podcast", hitsPerPage: 3 } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, { success: false, message: "Invalid token" });
});

Deno.test("podwise#podcasts/search schema gate: q non-empty, hitsPerPage 1-30", async () => {
    const unit = await testSealedUnit("podwise#podcasts/search");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const bad: RunInput[] = [
        { queryParams: { q: "" } },
        { queryParams: { q: "Dwarkesh Podcast", hitsPerPage: 31 } },
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
            input: { queryParams: { q: "Dwarkesh Podcast", hitsPerPage: 30 } },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test({
    name: "podwise#podcasts/search live (gated on PODWISE_API_KEY)",
    ignore: liveSkip("podwise"),
    fn: async () => {
        const unit = await testSealedUnit("podwise#podcasts/search");
        const result = await runEndpoint({
            unit,
            input: { queryParams: { q: "Dwarkesh Podcast", hitsPerPage: 2 } },
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
        const hits = output.result as Record<string, unknown>[];
        assert(Array.isArray(hits), "result is an array");
        for (const hit of hits) assertEquals(typeof hit.name, "string");
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
