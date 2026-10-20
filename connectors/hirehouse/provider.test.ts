import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const J1 = "3f1c2a4e-8b7d-4c1e-9a2f-5d6e7f8a9b01";
const J2 = "7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const FREE = { credits: {}, evidence: {} };
const IDS = [
    "hirehouse#jobs/search",
    "hirehouse#jobs/{id}",
    "hirehouse#jobs/compare",
];

Deno.test("hirehouse: every endpoint is FREE, categorised jobs, and tags monid", async () => {
    for (const id of IDS) {
        const unit = await testSealedUnit(id);
        assertEquals(unit.doc.usage.model.kind, "FREE", id);
        assertEquals(unit.doc.meta.categories, ["jobs"], id);
        assertEquals(
            unit.doc.request.headers?.["X-HireHouse-Source"],
            "monid",
            id,
        );
    }
});

Deno.test("hirehouse#jobs/search happy: job cards pass through, zero usage", async () => {
    const unit = await testSealedUnit("hirehouse#jobs/search");
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                query: "backend engineer",
                workMode: "remote",
                limit: 1,
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-search-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, FREE);
    const output = result.output as {
        match: string;
        nextCursor: string;
        jobs: { id: string; applyUrl: string }[];
    };
    assertEquals(output.match, "exact");
    assertEquals(output.jobs[0].id, J1);
    assert(output.jobs[0].applyUrl.includes("utm_source=monid"));
    assertEquals(output.nextCursor, "bzox");
});

Deno.test("hirehouse#jobs/{id} happy: substitutes {id}, full description", async () => {
    const unit = await testSealedUnit("hirehouse#jobs/{id}");
    assertEquals(unit.doc.input.schema.pathParams?.required, ["id"]);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: J1 } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-job-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, FREE);
    const { job } = result.output as {
        job: { id: string; requirements: string };
    };
    assertEquals(job.id, J1);
    assert(job.requirements.length > 0);
});

Deno.test("hirehouse#jobs/compare happy: two jobs side by side", async () => {
    const unit = await testSealedUnit("hirehouse#jobs/compare");
    const result = await runEndpoint({
        unit,
        input: { queryParams: { ids: `${J1},${J2}` } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-compare-happy.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, FREE);
    assertEquals((result.output as { total: number }).total, 2);
});

Deno.test("hirehouse provider errors (404, 429) are data, zero usage", async () => {
    const unit = await testSealedUnit("hirehouse#jobs/{id}");
    for (const name of ["synthetic-not-found", "synthetic-rate-limited"]) {
        const result = await runEndpoint({
            unit,
            input: { pathParams: { id: J2 } },
            mode: "replay",
            fixture: await loadFixture(`${fixturesDir}${name}.json`),
        });
        assertEquals(result.isProviderError, true, name);
        assertEquals(result.usage, FREE, name);
    }
});

Deno.test({
    name: "hirehouse#jobs/search live (gated like every live test)",
    ignore: liveSkip("hirehouse"),
    fn: async () => {
        const unit = await testSealedUnit("hirehouse#jobs/search");
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
    },
});
