import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("fixtures/", import.meta.url));

Deno.test("fundmomentum#mcp/search_lps happy (real recording): LP records returned, billed per row via the vendor's _meta receipt", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_lps");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { country: "Germany", limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Settled from the vendor's _meta.credits_charged (this tool has no
    // in-payload `billing` block, unlike search_funds — provider.ts
    // falls back to _meta for it, which this locks in).
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { RESULT: 3 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("content" in output, false);
    assertEquals("_meta" in output, false);
    const results = output.results as Record<string, unknown>[];
    assertEquals(results.length, 3);
    assertEquals(results[0].slug, "kfw-capital");
    assertEquals(results[2].name, "Commerzbank AG");
    assertEquals(output.returned, 3);
    assertEquals(output.matched, 36);
    assertEquals(output.truncated, true);
    assertEquals(output.truncated_reason, "limit");
});

Deno.test("fundmomentum#mcp/search_lps: an empty match costs nothing", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_lps");
    const fixture = await loadFixture(`${fixturesDir}empty-match.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: { country: "Germany", lp_type: "Sovereign wealth fund" },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // A zero claim is pruned by the engine as "nothing consumed", so
    // this settles via the derived fold — which also lands on 0 since
    // `results` is empty. Same end state either way: no credits owed.
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.matched, 0);
    const results = output.results as unknown[];
    assertEquals(results.length, 0);
    // No truncated/truncated_reason/note at all when there's nothing to
    // page through — omitted, not null (live-verified).
    assertEquals("truncated" in output, false);
});

Deno.test("fundmomentum#mcp/search_lps: a balance that covers only part of a page is shrunk to fit, not refused", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_lps");
    const fixture = await loadFixture(`${fixturesDir}balance-bound.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { limit: 25 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Only 19 of the requested 25 were affordable — charged for the 19
    // actually returned, not refused outright and not charged for the
    // 25 requested.
    assertEquals(result.usage, {
        credits: { default: 19 },
        evidence: { RESULT: 19 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.returned, 19);
    assertEquals(output.matched, 768);
    assertEquals(output.truncated_reason, "balance");
    const results = output.results as unknown[];
    assertEquals(results.length, 19);
});

Deno.test("fundmomentum#mcp/search_lps: a zero balance is a real HTTP 402 MPP payment challenge, zero usage", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_lps");
    const fixture = await loadFixture(
        `${fixturesDir}insufficient-credits.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: { country: "France", limit: 5 } },
        mode: "replay",
        fixture,
    });
    // Live-verified 2026-11-03: unlike search_funds's ad-hoc JSON-RPC
    // insufficient_credits error, a drained search_lps key gets a real
    // MPP (micropayment protocol) payment-required challenge — still a
    // real non-2xx, relayed untouched by lifecycle.start's first branch
    // exactly like any other provider error.
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

Deno.test("fundmomentum#mcp/search_lps: an exact repeat of a prior call is a free idempotent replay, never double-billed (added by the vendor 2026-11-04)", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_lps");
    const fixture = await loadFixture(`${fixturesDir}idempotent-replay.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { country: "Germany", limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // The echoed _meta has idempotent_replay: true, so nothing is
    // charged this time even though `results` still carries 3 real
    // rows — endpoint.ts's usage.evidence zeroes its own fold when
    // this flag is set, same as search-funds/endpoint.ts.
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
    const output = result.output as Record<string, unknown>;
    const results = output.results as unknown[];
    assertEquals(results.length, 3);
});

Deno.test("fundmomentum#mcp/search_lps: limit above 25 is rejected outright, not clamped, and never charged", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_lps");
    const fixture = await loadFixture(`${fixturesDir}invalid-args.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { limit: 30 } },
        mode: "replay",
        fixture,
    });
    // A 200-with-body-level-error is mapped to a synthesized httpStatus
    // via providerHttpStatus, same as search-funds's own invalid_args
    // handling — "invalid_args" → 400.
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const body = result.output as Record<string, unknown>;
    const error = body.error as Record<string, unknown>;
    const data = error.data as Record<string, unknown>;
    assertEquals(data.error_reason, "invalid_args");
    assertEquals(data.checked_before_payment, true);
    assertEquals(data.no_payment_required, true);
});

Deno.test("fundmomentum#mcp/search_lps: limit has a floor of 1 enforced client-side, lp_type is a closed enum", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/search_lps");
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
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { lp_type: "Not A Real Type" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    const passing: Json[] = [
        {},
        { limit: 1 },
        { limit: 25 },
        { country: "Germany" },
        { country: "DE", lp_type: "Pension fund" },
        { backs_emerging_managers: true },
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
