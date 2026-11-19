import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const ID = "hirebase#jobs/estimate";
const INPUT = {
    body: {
        job_titles: ["data engineer"],
        location_types: ["Remote"],
        days_ago: 7,
        limit: 0,
    },
};

Deno.test(`${ID} happy: a count, free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assert(typeof (result.output as { cost: number }).cost === "number");
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
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
