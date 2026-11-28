import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "outbound-dev#emails/verify";
const BODY = { email: "ana.ruiz@halden-freight.example" };

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#emails/verify: a verdict settles $0.01", async () => {
    const result = await run("synthetic-verify-valid.json", BODY);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { RESULT: 1 },
    });
    assertEquals(result.output, { ...BODY, status: "valid" });
});

Deno.test("outbound-dev#emails/verify: `unknown` is free", async () => {
    const result = await run("synthetic-verify-unknown.json", BODY);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    assertEquals((result.output as Record<string, unknown>).status, "unknown");
});

Deno.test("outbound-dev#emails/verify: a check with no verdict in time is a 500 with no envelope, zero-billed", async () => {
    const result = await run("synthetic-server-error.json", BODY);
    assertEquals(result.httpStatus, 500);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // No envelope to digest: the default message, and the raw empty object.
    assertEquals(result.output, { message: "outbound.dev API error", raw: {} });
});

Deno.test("outbound-dev#emails/verify estimate: one verdict", async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: BODY,
    });
    assertEquals(usage.credits, { default: 0.01 });
});

Deno.test("outbound-dev#emails/verify: the gate rejects a missing address and an unknown field", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-verify-valid.json`);
    const refused: Json[] = [{}, { ...BODY, strict: true }, { email: "" }];
    for (const body of refused) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: { body: BODY },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "outbound-dev#emails/verify live: an address gets one of four verdicts",
    ignore: liveSkip("outbound-dev"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { email: "nobody@example.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const status = (result.output as Record<string, unknown>).status;
        assert(
            status === "valid" || status === "invalid" || status === "risky" ||
                status === "unknown",
        );
    },
});
