import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

const ID = "hirebase#jobs/salary-benchmark";
const INPUT = {
    body: {
        job_title: "Data Engineer",
        yoe_range: { min: 3, max: 6 },
        geo_locations: [{ country: "United States" }],
        salary_range: {
            min: 130000,
            max: 160000,
            currency: "USD",
            period: "yearly",
        },
    },
};

Deno.test(`${ID} happy: queued, polled to finished, one unit, report unwrapped`, async () => {
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
        credits: { salary_benchmarks: 1 },
        evidence: { CALL: 1 },
    });
    const output = result.output as {
        task_id: string;
        report: { market: { salary: { p50: number } } };
    };
    assertEquals(Object.keys(output).sort(), ["input", "report", "task_id"]);
    assert(typeof output.report.market.salary.p50 === "number");
    // queue bookkeeping (the account's user id, the worker) stays out
    assert(!JSON.stringify(output).includes("user_id"));
    assert(!JSON.stringify(output).includes("worker_id"));
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
        assertEquals(result.usage.credits, { salary_benchmarks: 1 });
    },
});
