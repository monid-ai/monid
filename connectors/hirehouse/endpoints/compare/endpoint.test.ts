import { assertEquals, assertRejects } from "@std/assert";
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
const ID = "hirehouse#jobs/compare";
const FREE = { credits: {}, evidence: {} };
const J1 = "3f1c2a4e-8b7d-4c1e-9a2f-5d6e7f8a9b01";
const J2 = "7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

Deno.test("hirehouse#jobs/compare happy: two jobs, whole body, FREE", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-compare-happy.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { ids: `${J1},${J2}` } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals((result.output as { jobs: unknown[] }).jobs.length, 2);
});

Deno.test("hirehouse#jobs/compare provider error: 404 is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-compare-not-found.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { ids: `${J2},${J1}` } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE);
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("hirehouse#jobs/compare schema gate: empty ids / unknown key rejected, ids passes", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-compare-happy.json`,
    );
    for (
        const queryParams of <Record<string, string>[]> [
            { ids: "" },
            { ids: `${J1},${J2}`, extra: "x" },
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
    // near-twin: the same ids in the other order validate (and fail
    // later, at replay URL matching)
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { queryParams: { ids: `${J2},${J1}` } },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test({
    name: "hirehouse#jobs/compare live (gated on HIREHOUSE_API_KEY)",
    ignore: liveSkip("hirehouse"),
    fn: async () => {
        const search = await runEndpoint({
            unit: await testSealedUnit("hirehouse#jobs/search"),
            input: { queryParams: { limit: 2 } },
            mode: "live",
        });
        const ids = (search.output as { jobs: { id: string }[] }).jobs
            .map((job) => job.id).join(",");
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { queryParams: { ids } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, FREE);
        assertEquals((result.output as { jobs: unknown[] }).jobs.length, 2);
    },
});
