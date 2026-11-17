import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("fixtures/", import.meta.url));

Deno.test("fundmomentum#mcp/search_funds happy (real recording): results wrapped in an object, billed per fund returned via the vendor's own receipt", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_funds");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { stage: "seed", country: "Germany", limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Settled from the vendor's own billing.credits_charged (v1.9.0's
    // documented receipt, preferred in provider.ts over the older
    // undocumented _meta field the two always agree with here), not
    // the flat 1-credit-per-call model this connector shipped with
    // originally: 3 funds returned, 3 credits.
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { RESULT: 3 },
    });
    const output = result.output as Record<string, unknown>;
    // The MCP envelope and its billing bookkeeping never reach the caller.
    assertEquals("content" in output, false);
    assertEquals("_meta" in output, false);
    const results = output.results as Record<string, unknown>[];
    assertEquals(results.length, 3);
    assertEquals(results[1].slug, "alstin-iii");
    assertEquals(output.returned, 3);
    assertEquals(output.matched, 46);
    assertEquals(output.truncated, true);
    assertEquals(output.truncated_reason, "limit");
    // v1.9.0: the billing receipt now also rides in the payload body
    // itself, publicly documented, and is still visible to the caller
    // (unlike _meta, which is stripped above) — not a bookkeeping
    // field the engine owns exclusively.
    const billing = output.billing as Record<string, unknown>;
    assertEquals(billing.credits_charged, 3);
    assertEquals(billing.payment_mode, "credits");
});

Deno.test("fundmomentum#mcp/search_funds: an empty match costs nothing (v1.9.0 removed the old 1-credit floor)", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_funds");
    const fixture = await loadFixture(`${fixturesDir}empty-match.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                stage: "seed",
                country: "Germany",
                closed_since: "2099-01-01",
                limit: 3,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // A zero claim (billing.credits_charged: 0) is pruned by the engine
    // as "nothing consumed", so this settles via the derived fold —
    // which also lands on 0 since `results` is empty. Same end state
    // either way: no credits owed.
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.matched, 0);
    const results = output.results as unknown[];
    assertEquals(results.length, 0);
});

Deno.test("fundmomentum#mcp/search_funds: a balance that covers only part of a page is shrunk to fit, not refused (v1.9.0)", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_funds");
    const fixture = await loadFixture(`${fixturesDir}balance-bound.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { stage: "seed", industry: "saas", limit: 10 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Only 3 of the requested 10 were affordable — charged for the 3
    // actually returned, not refused outright and not charged for the
    // 10 requested.
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { RESULT: 3 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.truncated_reason, "balance");
    const billing = output.billing as Record<string, unknown>;
    assertEquals(billing.balance_after, 0);
});

Deno.test("fundmomentum#mcp/search_funds: a zero balance is a real HTTP 402 MPP payment challenge, zero usage (RE-VERIFIED 2026-11-04)", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_funds");
    const fixture = await loadFixture(
        `${fixturesDir}insufficient-credits.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { stage: "seed", industry: "fintech", limit: 5 } },
        mode: "replay",
        fixture,
    });
    // RE-VERIFIED LIVE 2026-11-04: the vendor's insufficient-credits
    // shape changed since the 2026-10-28 recording this replaces — it
    // is now a real MPP (micropayment protocol) payment-required
    // challenge, not the old ad-hoc JSON-RPC {error: {data: {
    // error_reason: "insufficient_credits"}}} body. Either way it's a
    // real non-2xx — relayed untouched by lifecycle.start's first
    // branch, same as any other provider error (401, 403, 429); no
    // code change was needed, only this fixture and test.
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const body = result.output as Record<string, unknown>;
    assertEquals(
        body.type,
        "https://paymentauth.org/problems/payment-required",
    );
    assertEquals(body.status, 402);
});

Deno.test("fundmomentum#mcp/search_funds: an exact repeat of a prior call is a free idempotent replay, never double-billed", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_funds");
    const fixture = await loadFixture(`${fixturesDir}idempotent-replay.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { stage: "seed", limit: 10 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // The echoed _meta/billing.credits_charged is a stale 10 from the
    // ORIGINAL call, but nothing was charged THIS time (idempotent_
    // replay: true). Zeroing consolidate's claim alone would only get
    // pruned and fall back to a derived fold over the 10 real rows
    // still in `results` — the exact same double-bill in a different
    // guise — so endpoint.ts's usage.evidence also zeroes its own
    // fold when this flag is set, landing on a genuine zero both ways.
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
});

Deno.test("fundmomentum#mcp/search_funds: limit has a floor of 1, no client-side ceiling (the vendor's own tier cap applies server-side)", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_funds");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { limit: 0 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    const passing: Json[] = [
        {},
        { limit: 1 },
        { limit: 250 },
        { stage: "pre_seed", industry: "ai_ml" },
        { closed_since: "2026-09-01" },
        { limit: 50, offset: 50 },
    ];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(ok.isProviderError, false, JSON.stringify(body));
    }
});
