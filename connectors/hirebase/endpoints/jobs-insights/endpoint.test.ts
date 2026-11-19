import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const ID = "hirebase#jobs/insights";
const INPUT = {
    body: {
        job_titles: ["data engineer"],
        geo_locations: [{ country: "United States" }],
        days_ago: 30,
        top_companies_limit: 3,
    },
};

Deno.test(`${ID} happy`, async () => {
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
    assertEquals(result.usage, {
        credits: { insights: 1 },
        evidence: { CALL: 1 },
    });
    assert(result.output !== null && typeof result.output === "object");
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
        assertEquals(result.usage.credits, { insights: 1 });
    },
});
