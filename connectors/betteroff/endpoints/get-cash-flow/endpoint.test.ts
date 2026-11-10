import type { Json } from "@shared/core";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { zOutput } from "./schema/output.ts";

const fixtureRoot = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const input = { body: { startDate: null, endDate: null } };

Deno.test("betteroff#get_cash_flow: preserves its v4 result and settles zero usage", async () => {
    const unit = await testSealedUnit("betteroff#get_cash_flow");
    const fixture = await loadFixture(`${fixtureRoot}synthetic-cash-flow.json`);
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(
        result.output,
        (fixture.calls[0].res.body as { result: { structuredContent: Json } })
            .result.structuredContent,
    );
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("betteroff#get_cash_flow: a revoked grant stays a provider error with zero usage", async () => {
    const unit = await testSealedUnit("betteroff#get_cash_flow");
    const fixture = await loadFixture(`${fixtureRoot}synthetic-forbidden.json`);
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 403);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("betteroff#get_cash_flow: rejects invalid inputs before transport and accepts their valid twins", async () => {
    const unit = await testSealedUnit("betteroff#get_cash_flow");
    const pairs: { bad: Json; good: Json }[] = [
        {
            bad: { startDate: "2026-02-30", endDate: null },
            good: { startDate: "2026-02-28", endDate: null },
        },
        {
            bad: { startDate: "2025-02-29", endDate: null },
            good: { startDate: "2024-02-29", endDate: null },
        },
        { bad: { startDate: null }, good: { startDate: null, endDate: null } },
        { bad: { endDate: null }, good: { startDate: null, endDate: null } },
        {
            bad: { startDate: null, endDate: "2026-10-10T12:00:00Z" },
            good: { startDate: null, endDate: "2026-10-10" },
        },
        {
            bad: { ...input.body, householdId: "synthetic-other" },
            good: input.body,
        },
        {
            bad: { ...input.body, accessToken: "synthetic-injected" },
            good: input.body,
        },
        {
            bad: { ...input.body, name: "betteroff_request_transfer" },
            good: input.body,
        },
    ];
    for (const { bad, good } of pairs) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body: bad }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
        assertEquals(await estimateEndpoint(unit, { body: good }), {
            credits: {},
            evidence: {},
        });
    }
});

Deno.test("betteroff#get_cash_flow: rejects null data and malformed financial fields", async () => {
    const unit = await testSealedUnit("betteroff#get_cash_flow");
    for (
        const scenario of [
            "null-data",
            "missing-income",
            "money",
            "ratio",
            "projection",
        ]
    ) {
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-cash-flow.json`,
        );
        const structured = (fixture.calls[0].res.body as {
            result: { structuredContent: Record<string, Json> };
        }).result.structuredContent;
        const data = structured.data as Record<string, Json>;
        if (scenario === "null-data") structured.data = null;
        if (scenario === "missing-income") delete data.income;
        if (scenario === "money") data.income = "$5200.10";
        if (scenario === "ratio") data.savingsRatePercent = "38";
        if (scenario === "projection") {
            (data.projection as Record<string, Json>).projectedNet = null;
        }
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "CONTRACT_VIOLATION",
        );
    }
});

Deno.test("betteroff#get_cash_flow: preserves precise money, numeric contract values, and nullable projections", async () => {
    const unit = await testSealedUnit("betteroff#get_cash_flow");
    for (const income of ["12345678901234567890.01", 5200.1]) {
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-cash-flow.json`,
        );
        const structured = (fixture.calls[0].res.body as {
            result: { structuredContent: Record<string, Json> };
        }).result.structuredContent;
        const data = structured.data as Record<string, Json>;
        data.income = income;
        data.projection = null;
        data.savingsRatePercent = null;
        (data.priorPeriod as Record<string, Json>).savingsRatePercent = null;
        (data.dailyRates as Record<string, Json>).providerExtension = {
            estimated: true,
        };
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.output, structured);
    }
});

Deno.test("betteroff#get_cash_flow: leaves date-range validation to BetterOff and preserves its denial", async () => {
    const unit = await testSealedUnit("betteroff#get_cash_flow");
    for (
        const body of [
            { startDate: "2026-10-10", endDate: "2026-10-01" },
            { startDate: "2024-01-01", endDate: "2026-10-10" },
        ]
    ) {
        assertEquals(await estimateEndpoint(unit, { body }), {
            credits: {},
            evidence: {},
        });
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-invalid-range.json`,
        );
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, true);
        assertEquals(result.httpStatus, 502);
        assertEquals(result.providerHttpStatus, 200);
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    }
});

Deno.test({
    name:
        "betteroff#get_cash_flow live: validates shape without logging household records",
    ignore: liveSkip("betteroff", ["accessToken"]),
    fn: async () => {
        const unit = await testSealedUnit("betteroff#get_cash_flow");
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(result.isProviderError, false);
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(
            zOutput.safeParse(result.output).success,
            "Expected the BetterOff v4 get_cash_flow result shape",
        );
    },
});
