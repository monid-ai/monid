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

Deno.test("betteroff#get_setup_status: preserves its v4 result and settles zero usage", async () => {
    const unit = await testSealedUnit("betteroff#get_setup_status");
    const fixture = await loadFixture(
        `${fixtureRoot}synthetic-setup-status.json`,
    );
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

Deno.test("betteroff#get_setup_status: a revoked grant stays a provider error with zero usage", async () => {
    const unit = await testSealedUnit("betteroff#get_setup_status");
    const fixture = await loadFixture(`${fixtureRoot}synthetic-forbidden.json`);
    const result = await runEndpoint({ unit, input, mode: "replay", fixture });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 403);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("betteroff#get_setup_status: rejects invalid inputs before transport and accepts their valid twins", async () => {
    const unit = await testSealedUnit("betteroff#get_setup_status");
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

Deno.test("betteroff#get_setup_status: rejects missing data and invalid account or step shapes", async () => {
    const unit = await testSealedUnit("betteroff#get_setup_status");
    for (
        const scenario of [
            "null-data",
            "account-count",
            "step-status",
            "missing-access-url",
        ]
    ) {
        const fixture = await loadFixture(
            `${fixtureRoot}synthetic-setup-status.json`,
        );
        const structured = (fixture.calls[0].res.body as {
            result: { structuredContent: Record<string, Json> };
        }).result.structuredContent;
        const data = structured.data as Record<string, Json>;
        if (scenario === "null-data") structured.data = null;
        if (scenario === "account-count") {
            (data.accounts as Record<string, Json>).count = "2";
        }
        if (scenario === "step-status") {
            (data.steps as Record<string, Json>[])[0].status = "unknown";
        }
        if (scenario === "missing-access-url") delete data.manageAgentAccessUrl;
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay", fixture }),
            Error,
            "CONTRACT_VIOLATION",
        );
    }
});

Deno.test({
    name:
        "betteroff#get_setup_status live: validates shape without logging household records",
    ignore: liveSkip("betteroff", ["accessToken"]),
    fn: async () => {
        const unit = await testSealedUnit("betteroff#get_setup_status");
        const result = await runEndpoint({ unit, input, mode: "live" });
        assertEquals(result.isProviderError, false);
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assert(
            zOutput.safeParse(result.output).success,
            "Expected the BetterOff v4 get_setup_status result shape",
        );
    },
});
