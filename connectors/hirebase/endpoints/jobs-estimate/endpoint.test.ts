import { assert, assertEquals, assertRejects } from "@std/assert";
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
    "body": {
        "job_titles": [
            "data engineer",
        ],
        "location_types": [
            "Remote",
        ],
        "days_ago": 7,
        "limit": 0,
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
        "credits": {},
        "evidence": {},
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
        ["a negative limit", {
            "body": {
                "job_titles": [
                    "data engineer",
                ],
                "location_types": [
                    "Remote",
                ],
                "days_ago": 7,
                "limit": -1,
            },
        }],
        ["an unknown field", {
            "body": {
                "job_titles": [
                    "data engineer",
                ],
                "location_types": [
                    "Remote",
                ],
                "days_ago": 7,
                "limit": 0,
                "job_type": [
                    "Full Time",
                ],
            },
        }],
        ["page 0", {
            "body": {
                "job_titles": [
                    "data engineer",
                ],
                "location_types": [
                    "Remote",
                ],
                "days_ago": 7,
                "limit": 0,
                "page": 0,
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
        assert(typeof (result.output as { cost: number }).cost === "number");
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
