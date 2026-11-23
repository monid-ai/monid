import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "hirebase#jobs/expired-jobs";
const INPUT = {
    "queryParams": {
        "since": "2026-11-17",
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
        ["limit 0", {
            "queryParams": {
                "since": "2026-11-17",
                "limit": 0,
            },
        }],
        ["limit above 1000", {
            "queryParams": {
                "since": "2026-11-17",
                "limit": 1001,
            },
        }],
        ["since omitted", {
            "queryParams": {
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
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as { message: string; raw: unknown };
        assert(typeof output.message === "string");
        assert(output.raw !== undefined);
    },
});
