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
const input = { body: {} };

Deno.test("betteroff#list_recurring: preserves its v4 result and settles zero usage", async () => {
    const unit = await testSealedUnit("betteroff#list_recurring");
    const fixture = await loadFixture(`${fixtureRoot}synthetic-recurring.json`);
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

Deno.test("betteroff#list_recurring: a revoked grant stays a provider error with zero usage", async () => {
    const unit = await testSealedUnit("betteroff#list_recurring");
    const fixture = await loadFixture(`${fixtureRoot}synthetic-forbidden.json`);
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 403);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("betteroff#list_recurring: Core denial is an error, not unavailable recurring data", async () => {
    const unit = await testSealedUnit("betteroff#list_recurring");
    assert(unit.doc.meta.description);
    assert(unit.doc.meta.description.includes("BetterOff Core"));
    assert(unit.doc.meta.description.includes("cashflow:read"));
    const fixture = await loadFixture(
        `${fixtureRoot}synthetic-core-required.json`,
    );
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.output, fixture.calls[0].res.body);
    const failure = (result.output as {
        result: { structuredContent: Record<string, Json> };
    }).result.structuredContent;
    assertEquals(failure.code, "AGENT_SUBSCRIPTION_INACTIVE");
    assertEquals(failure.retryable, false);
    assertEquals(
        failure.nextStep,
        "Subscribe to BetterOff Core in Settings > Billing, then call again.",
    );
    assertEquals(failure.data, undefined);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(zOutput.safeParse(failure).success, false);

    // A separately authorized success remains accepted; the connector does not
    // infer plan eligibility from a setup-status result or cache this denial.
    const allowed = await runEndpoint({
        unit,
        input,
        mode: "replay",
        fixture: await loadFixture(`${fixtureRoot}synthetic-recurring.json`),
    });
    assertEquals(allowed.isProviderError, false);
    assertEquals(allowed.httpStatus, 200);
    assert(zOutput.safeParse(allowed.output).success);
});

Deno.test("betteroff#list_recurring: rejects invalid inputs before transport and accepts their valid twins", async () => {
    const unit = await testSealedUnit("betteroff#list_recurring");
    const pairs: { bad: Json; good: Json }[] = [
        { bad: { householdId: "synthetic-other" }, good: {} },
        { bad: { accessToken: "synthetic-injected" }, good: {} },
        { bad: { name: "betteroff_request_transfer" }, good: {} },
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

Deno.test("betteroff#list_recurring: rejects null data and malformed stream shapes", async () => {
    const unit = await testSealedUnit("betteroff#list_recurring");
    for (
        const scenario of [
            "null-data",
            "missing-items",
            "money",
            "source",
            "stale",
            "counts",
        ]
    ) {
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-recurring.json`,
        );
        const structured = (fixture.calls[0].res.body as {
            result: { structuredContent: Record<string, Json> };
        }).result.structuredContent;
        const data = structured.data as Record<string, Json>;
        const item = (data.items as Record<string, Json>[])[0];
        if (scenario === "null-data") structured.data = null;
        if (scenario === "missing-items") delete data.items;
        if (scenario === "money") item.amount = "unknown";
        if (scenario === "source") item.source = "other";
        if (scenario === "stale") item.stale = null;
        if (scenario === "counts") {
            delete (data.counts as Record<string, Json>).unknownStatus;
        }
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "CONTRACT_VIOLATION",
        );
    }
});

Deno.test("betteroff#list_recurring: accepts unavailable data with an empty stream list", async () => {
    const unit = await testSealedUnit("betteroff#list_recurring");
    const fixture = await loadFixture(`${fixtureRoot}synthetic-recurring.json`);
    const structured = (fixture.calls[0].res.body as {
        result: { structuredContent: Record<string, Json> };
    }).result.structuredContent;
    structured.asOf = null;
    structured.quality = {
        state: "unavailable",
        reasons: ["No synthetic recurring source is available."],
    };
    structured.evidence = [];
    structured.page = {
        returnedCount: 0,
        totalCount: 0,
        truncated: false,
        nextCursor: null,
    };
    structured.data = {
        asOf: null,
        count: 0,
        counts: {
            active: 0,
            activeCharges: 0,
            activeIncoming: 0,
            inactive: 0,
            inactiveCharges: 0,
            inactiveIncoming: 0,
            unknownStatus: 0,
        },
        items: [],
    };
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, structured);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name:
        "betteroff#list_recurring live: Core household result validates without logging records",
    ignore: liveSkip("betteroff", ["accessToken"]),
    fn: async () => {
        const unit = await testSealedUnit("betteroff#list_recurring");
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(result.isProviderError, false);
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(
            zOutput.safeParse(result.output).success,
            "Expected the BetterOff v4 list_recurring result shape",
        );
    },
});
