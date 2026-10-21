import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "dansugc#broll/purchase";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const FRESH = "7e568b94-329c-4615-a91e-458d2185f83d";
const OWNED = "1166a85d-b967-4fb0-8ed8-6d2f2d22f23b";

const run = async (fixtureName: string, body: Record<string, Json>) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}${fixtureName}.json`),
    });

Deno.test(`${ID} confirmation step (recorded 409): free, and the total is handed back`, async () => {
    const result = await run("confirm", { video_ids: [FRESH] });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Json>;
    assertEquals(output.error_code, "requires_confirmation");
    assertEquals(output.expected_total_cents, 1100);
});

Deno.test(`${ID} paid on the platform key (synthetic): 13 per clip, an earlier license charged again; the claim and the fold agree`, async () => {
    const result = await run("synthetic-paid", {
        video_ids: [FRESH, OWNED],
        expected_total_cents: 2600,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 26 },
        evidence: { CREDIT: 26 },
    });
    const output = result.output as {
        purchases: { download_url: string }[];
        already_purchased: unknown[];
    };
    assertEquals(output.purchases.length, 2);
    assertEquals(output.already_purchased.length, 0);
});

Deno.test(`${ID} already owned (recorded): 200 at zero credits (the zero claim prunes)`, async () => {
    const result = await run("already-owned", {
        video_ids: [OWNED],
        expected_total_cents: 0,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
});

Deno.test(`${ID} no total_amount (synthetic): the derived fold settles`, async () => {
    const result = await run("synthetic-no-meter", {
        video_ids: [FRESH, OWNED],
        expected_total_cents: 2600,
    });
    assertEquals(result.usage, {
        credits: { default: 26 },
        evidence: { CREDIT: 26 },
    });
});

Deno.test(`${ID} insufficient balance (synthetic 402): zero usage`, async () => {
    const result = await run("synthetic-insufficient", {
        video_ids: [FRESH],
        expected_total_cents: 1100,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { message: string }).message,
        "Insufficient balance",
    );
});

Deno.test(`${ID} bad key (synthetic 401): zero usage, error digested`, async () => {
    const result = await run("synthetic-provider-error", {
        video_ids: [FRESH],
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { message: string }).message,
        "Invalid API key",
    );
});

Deno.test(`${ID}: the schema gate — 1 to 50 clip UUIDs, before any spend`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}confirm.json`);
    const run = (body: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { body: body as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            { video_ids: Array.from({ length: 51 }, () => FRESH) },
            { video_ids: [] },
            { video_ids: [FRESH.slice(0, -1)] },
            { video_ids: [FRESH], expected_total_cents: -1 },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    // the near twin (50 ids) passes the gate: the pure estimate prices it as
    // 50 clips at the platform key's flat 13 credits
    assertEquals(
        await estimateEndpoint(unit, {
            body: { video_ids: Array.from({ length: 50 }, () => FRESH) },
        }),
        { credits: { default: 650 }, evidence: { CREDIT: 650 } },
    );
});

Deno.test({
    name:
        `${ID} live (gated on DANSUGC_API_KEY): the confirmation step is free`,
    ignore: liveSkip("dansugc"),
    fn: async () => {
        // No expected_total_cents: DansUGC quotes and charges nothing (409).
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { video_ids: [FRESH] } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 409);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, Json>;
        assertEquals(output.error_code, "requires_confirmation");
        assertEquals(typeof output.expected_total_cents, "number");
    },
});
