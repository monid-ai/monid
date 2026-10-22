import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(
    new URL("../../fixtures/", import.meta.url),
);
const ID = "hirehouse#jobs/search";
const FREE = { credits: {}, evidence: {} };
const HAPPY_INPUT = {
    queryParams: { query: "backend engineer", workMode: "remote", limit: 1 },
};

Deno.test("hirehouse#jobs/search happy: the fixture body passes through whole, FREE", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-happy.json`,
    );
    const result = await runEndpoint({
        unit,
        input: HAPPY_INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
    // whole-body equality pins the exact jobs count (1) and every field
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as { jobs: { applyUrl: string }[] };
    assertEquals(output.jobs.length, 1);
    assert(output.jobs[0].applyUrl.includes("utm_source=monid"));
});

Deno.test("hirehouse#jobs/search provider error: 429 is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-rate-limited.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { query: "engineer" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE);
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("hirehouse#jobs/search schema gate: limit 51 / unknown workMode rejected, limit 50 passes", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-search-happy.json`,
    );
    for (
        const queryParams of [
            { ...HAPPY_INPUT.queryParams, limit: 51 },
            { ...HAPPY_INPUT.queryParams, workMode: "space" },
        ]
    ) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    // near-twin: limit 50 validates (it fails later, at replay URL
    // matching — proving the schema let it through)
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { queryParams: { ...HAPPY_INPUT.queryParams, limit: 50 } },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test({
    name: "hirehouse#jobs/search live (gated on HIREHOUSE_API_KEY)",
    ignore: liveSkip("hirehouse"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { query: "engineer", limit: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, FREE);
        const jobs = (result.output as { jobs: unknown[] }).jobs;
        assert(jobs.length <= 2);
    },
});
