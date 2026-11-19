import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const ID = "hirebase#companies/{company_slug}/jobs";
const INPUT = {
    pathParams: { company_slug: "stripe" },
    queryParams: { limit: 2 },
};

Deno.test(`${ID} happy: billed per job returned`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { jobs: 2 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as { jobs: unknown[]; total_count: number };
    assertEquals(output.jobs.length, 2);
    assert(output.total_count >= 2);
});

Deno.test(`${ID} unknown slug: 200 with no jobs, free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}unknown-slug.json`);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { company_slug: "zzz-not-a-company-qq" },
            queryParams: { limit: 2 },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test({
    name: `${ID} live (gated on HIREBASE_CREDENTIALS_API_KEY)`,
    ignore: liveSkip("hirebase"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.credits, { jobs: 2 });
    },
});
