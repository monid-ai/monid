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
const ID = "hirehouse#jobs/{id}";
const FREE = { credits: {}, evidence: {} };
const J1 = "3f1c2a4e-8b7d-4c1e-9a2f-5d6e7f8a9b01";
const J2 = "7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

Deno.test("hirehouse#jobs/{id} happy: substitutes {id}, whole body, FREE", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(unit.doc.input.schema.pathParams?.required, ["id"]);
    const fixture = await loadFixture(`${fixturesDir}synthetic-job-happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: J1 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("hirehouse#jobs/{id} provider error: 404 is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-not-found.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: J2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE);
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("hirehouse#jobs/{id} schema gate: a near-UUID is rejected, a UUID passes", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-job-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                // one hex digit short
                input: { pathParams: { id: J2.slice(0, -1) } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // near-twin: the full UUID validates (it fails later, at replay URL
    // matching — proving the schema let it through)
    const error = await assertRejects(() =>
        runEndpoint({
            unit,
            input: { pathParams: { id: J2 } },
            mode: "replay",
            fixture,
        })
    );
    assertEquals(String(error).includes("INVALID_INPUT"), false, String(error));
});

Deno.test({
    name: "hirehouse#jobs/{id} live (gated on HIREHOUSE_API_KEY)",
    ignore: liveSkip("hirehouse"),
    fn: async () => {
        const search = await runEndpoint({
            unit: await testSealedUnit("hirehouse#jobs/search"),
            input: { queryParams: { limit: 1 } },
            mode: "live",
        });
        const id = (search.output as { jobs: { id: string }[] }).jobs[0].id;
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { pathParams: { id } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, FREE);
        assert((result.output as { job: { id: string } }).job.id === id);
    },
});
