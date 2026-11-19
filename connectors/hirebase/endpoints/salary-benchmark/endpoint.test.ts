import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "hirebase#jobs/salary-benchmark";
const INPUT = {
    "body": {
        "job_title": "Data Engineer",
        "yoe_range": {
            "min": 3,
            "max": 6,
        },
        "geo_locations": [
            {
                "country": "United States",
            },
        ],
        "salary_range": {
            "min": 130000,
            "max": 160000,
            "currency": "USD",
            "period": "yearly",
        },
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
        "credits": {
            "salary_benchmarks": 1,
        },
        "evidence": {
            "CALL": 1,
        },
    });
    // the task wrapper is gone: the output is the report, beside the task
    // id and the resolved input, with no queue bookkeeping
    const finished = fixture.calls[fixture.calls.length - 1].res.body as {
        id: string;
        input: Json;
        result: Json;
    };
    assertEquals(result.output, {
        task_id: finished.id,
        input: finished.input,
        report: finished.result,
    });
    assert(!JSON.stringify(result.output).includes("user_id"));
    assert(!JSON.stringify(result.output).includes("worker_id"));
});

Deno.test(`${ID} provider error (recorded 401): data, zero usage, readable message`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}unauthorized.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "Invalid API key",
        raw: { detail: "Invalid API key" },
    });
});

Deno.test(`${ID} schema gate: near-valid inputs fail INVALID_INPUT, the valid twin passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: [string, Record<string, unknown>][] = [
        ["neither job_title nor public_url", {
            "body": {
                "geo_locations": [
                    {
                        "country": "United States",
                    },
                ],
            },
        }],
        ["a negative proposed salary", {
            "body": {
                "job_title": "Data Engineer",
                "yoe_range": {
                    "min": 3,
                    "max": 6,
                },
                "geo_locations": [
                    {
                        "country": "United States",
                    },
                ],
                "salary_range": {
                    "min": -1,
                    "max": 160000,
                },
            },
        }],
        ["days_ago above a year", {
            "body": {
                "job_title": "Data Engineer",
                "yoe_range": {
                    "min": 3,
                    "max": 6,
                },
                "geo_locations": [
                    {
                        "country": "United States",
                    },
                ],
                "salary_range": {
                    "min": 130000,
                    "max": 160000,
                    "currency": "USD",
                    "period": "yearly",
                },
                "days_ago": 366,
            },
        }],
    ];
    for (const [why, input] of rejected) {
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            why,
        );
    }
    // the gate is not too wide: the valid twin of every case above runs
    const ok = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
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
        // shape, not amounts: live counts move
        const output = result.output as {
            task_id: string;
            report: { market: { salary: { p50: number } } };
        };
        assert(typeof output.task_id === "string");
        assert(typeof output.report.market.salary.p50 === "number");
    },
});
