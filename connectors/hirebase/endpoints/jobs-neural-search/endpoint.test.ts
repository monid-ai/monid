import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "hirebase#jobs/neural-search";
const INPUT = {
    "body": {
        "vector": {
            "query": "backend engineer at an early-stage climate startup",
        },
        "lexical": {
            "location_types": [
                "Remote",
            ],
        },
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
        ["a misspelled filter inside lexical", {
            "body": {
                "vector": {
                    "query":
                        "backend engineer at an early-stage climate startup",
                },
                "lexical": {
                    "job_type": [
                        "Full Time",
                    ],
                },
                "limit": 2,
            },
        }],
        ["no vector", {
            "body": {
                "lexical": {
                    "location_types": [
                        "Remote",
                    ],
                },
                "limit": 2,
            },
        }],
        ["limit above the cap", {
            "body": {
                "vector": {
                    "query":
                        "backend engineer at an early-stage climate startup",
                },
                "lexical": {
                    "location_types": [
                        "Remote",
                    ],
                },
                "limit": 101,
            },
        }],
        ["an unknown field inside vector", {
            "body": {
                "vector": {
                    "text": "x",
                },
                "limit": 2,
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
    // the misspelled-filter case's corrected twin: lexical.job_types is
    // accepted (a pure estimate validates the input with no fixture)
    const twin = await estimateEndpoint(unit, {
        "body": {
            "vector": {
                "query": "backend engineer at an early-stage climate startup",
            },
            "lexical": {
                "job_types": [
                    "Full Time",
                ],
            },
            "limit": 2,
        },
    });
    assertEquals(twin.credits, { jobs: 2 });
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
        assert(Array.isArray((result.output as { jobs: unknown[] }).jobs));
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
    },
});
