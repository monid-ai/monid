import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const ID = "hirebase#jobs/{job_id}";

Deno.test(`${ID} happy: one lookup, one unit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { job_id: "6abfb8b9af3beb28eb871949" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { jobs: 1 },
        evidence: { CALL: 1 },
    });
    assertEquals(
        (result.output as { _id: string })._id,
        "6abfb8b9af3beb28eb871949",
    );
});

Deno.test(`${ID} not found: 404 is data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}not-found.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { job_id: "000000000000000000000000" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assert(
        (result.output as { message: string }).message.includes("not found"),
    );
});

Deno.test({
    name: `${ID} live (gated on HIREBASE_CREDENTIALS_API_KEY)`,
    ignore: liveSkip("hirebase"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { job_id: "000000000000000000000000" } },
            mode: "live",
        });
        // ids expire with their postings, so the stable live check is
        // the 404 contract: an unknown id is an unbilled provider error
        assertEquals(result.httpStatus, 404);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
