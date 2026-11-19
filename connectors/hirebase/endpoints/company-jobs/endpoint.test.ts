import { assert, assertEquals, assertRejects } from "@std/assert";
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
    "pathParams": {
        "company_slug": "stripe",
    },
    "queryParams": {
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
        ["limit above the cap", {
            "pathParams": {
                "company_slug": "stripe",
            },
            "queryParams": {
                "limit": 101,
            },
        }],
        ["limit omitted", {
            "pathParams": {
                "company_slug": "stripe",
            },
            "queryParams": {},
        }],
        ["an unknown query key", {
            "pathParams": {
                "company_slug": "stripe",
            },
            "queryParams": {
                "limit": 2,
                "sort_by": "salary",
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
