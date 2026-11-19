import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const ID = "hirebase#jobs/expired-jobs";

Deno.test(`${ID} happy: identifiers only, free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { since: "2026-11-17", limit: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as { jobs: Record<string, unknown>[] };
    assertEquals(Object.keys(output.jobs[0]).sort(), [
        "_id",
        "company_slug",
        "date_expired",
        "job_slug",
    ]);
});

Deno.test(`${ID} since older than 14 days: 400 is data, readable message`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}too-old.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { since: "2026-01-01", limit: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assert(
        (result.output as { message: string }).message.includes(
            "within the last 14 days",
        ),
    );
});

Deno.test({
    name: `${ID} live (gated on HIREBASE_CREDENTIALS_API_KEY)`,
    ignore: liveSkip("hirebase"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        // `since` must be recent, so the stable live check is the 400
        // contract for a date outside the 14-day window
        const result = await runEndpoint({
            unit,
            input: { queryParams: { since: "2020-01-01", limit: 1 } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 400);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
