import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "hirebase#jobs/search";
const INPUT = {
    "body": {
        "job_titles": [
            "data engineer",
        ],
        "location_types": [
            "Remote",
        ],
        "limit": 2,
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
            "jobs": 2,
        },
        "evidence": {
            "RESULT": 2,
        },
    });
    // nothing is consolidated out of a Hirebase body (the meter rides
    // headers), so the output is the response as recorded
    assertEquals(
        result.output,
        fixture.calls[fixture.calls.length - 1].res.body,
    );
});

Deno.test(`${ID} provider error (recorded 401): data, zero usage, readable message`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { limit: 1 } },
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
        ["job_type instead of job_types", {
            "body": {
                "job_titles": [
                    "data engineer",
                ],
                "location_types": [
                    "Remote",
                ],
                "limit": 2,
                "job_type": [
                    "Full Time",
                ],
            },
        }],
        ["limit above the cap", {
            "body": {
                "job_titles": [
                    "data engineer",
                ],
                "location_types": [
                    "Remote",
                ],
                "limit": 101,
            },
        }],
        ["limit omitted", {
            "body": {
                "job_titles": [
                    "data engineer",
                ],
            },
        }],
        ["a malformed date", {
            "body": {
                "job_titles": [
                    "data engineer",
                ],
                "location_types": [
                    "Remote",
                ],
                "limit": 2,
                "date_posted": "last week",
            },
        }],
        ["a negative salary bound", {
            "body": {
                "job_titles": [
                    "data engineer",
                ],
                "location_types": [
                    "Remote",
                ],
                "limit": 2,
                "salary": {
                    "min": -1,
                },
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
    // the negative-salary case's corrected twin: a zero bound is accepted
    // (a pure estimate validates the input with no fixture)
    const twin = await estimateEndpoint(unit, {
        "body": {
            "job_titles": [
                "data engineer",
            ],
            "location_types": [
                "Remote",
            ],
            "limit": 2,
            "salary": {
                "min": 0,
            },
        },
    });
    assertEquals(twin.credits, { jobs: 2 });
});

Deno.test(`${ID} empty: a search that matches nothing is free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}empty.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                job_titles: ['"zzqx nonexistent title qqq"'],
                limit: 5,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} 422: a list-shaped detail becomes one message`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}invalid-filter.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                experience: ["Senior"],
                sub_industry: ["Not A Real Subindustry"],
                limit: 1,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as { message: string };
    assert(output.message.startsWith("Invalid request: "));
});

Deno.test(`${ID}: the documented flag and scalar forms pass the schema`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    // Hirebase takes yes/no flags as booleans or "true"/"false", and
    // company_domain / company_slug / industry as one string or a list.
    // Each of these reaches the wire (the 401 fixture answers) instead
    // of failing INVALID_INPUT.
    const bodies: Record<string, Json>[] = [
        { limit: 1, visa: "true", hide_recruiting_agencies: false },
        { limit: 1, company_domain: "ford.com", industry: "Healthcare" },
        { limit: 1, company_slug: ["stripe"], date_posted: "2026-11-01" },
    ];
    for (const body of bodies) {
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture: {
                ...fixture,
                calls: fixture.calls.map((call) => ({
                    ...call,
                    req: { ...call.req, body },
                })),
            },
        });
        assertEquals(result.httpStatus, 401, JSON.stringify(body));
    }
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
            jobs: unknown[];
            total_count: number;
        };
        assert(Array.isArray(output.jobs));
        assert(typeof output.total_count === "number");
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
    },
});
