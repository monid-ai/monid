import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const PROFILE = "a23ff3b7-b6cc-4ac6-8d4f-0c909cd956f5";

Deno.test("orbit#v3/enrich/{profile_id}: a dispatched full build settles 10", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich/{profile_id}");
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { profile_id: PROFILE },
            body: { operation: "full" },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-enrich-built.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 10 },
        evidence: { full_profile: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals(output.generation_level, 3);
});

Deno.test("orbit#v3/enrich/{profile_id}: a profile already at depth settles ZERO", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich/{profile_id}");
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { profile_id: PROFILE },
            body: { operation: "full" },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-enrich-noop.json`),
    });

    // THE regression this file exists for. The snapshot reports
    // generation_level 3 and status completed — identical to the built case
    // — and the ONLY thing separating them is that Orbit never dispatched.
    // A settle keyed on the depth reached would bill 10 credits for a read.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).generation_level,
        3,
    );
});

Deno.test("orbit#v3/enrich/{profile_id}: a refusal is zero-billed data", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich/{profile_id}");
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { profile_id: PROFILE },
            body: { operation: "partial" },
        },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-enrich-provider-error.json`,
        ),
    });

    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("orbit#v3/enrich/{profile_id} estimate: the depth asked for, once", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich/{profile_id}");
    const partial = await estimateEndpoint(unit, {
        pathParams: { profile_id: PROFILE },
        body: { operation: "partial" },
    });
    assertEquals(partial, {
        credits: { default: 5 },
        evidence: { partial_profile: 1 },
    });

    // `regenerate` rebuilds, so it is priced as the full build it is.
    const regenerate = await estimateEndpoint(unit, {
        pathParams: { profile_id: PROFILE },
        body: { operation: "regenerate" },
    });
    assertEquals(regenerate, {
        credits: { default: 10 },
        evidence: { full_profile: 1 },
    });
});

Deno.test("orbit#v3/enrich/{profile_id}: the REQUEST states the operation, not the echo", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich/{profile_id}");
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { profile_id: PROFILE },
            body: { operation: "partial" },
        },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-enrich-echo-missing.json`,
        ),
    });

    // The terminal snapshot omits `operation` and reports level 3. Reading
    // the operation off the response would find no `partial`, fall to the
    // full branch and charge 10 for a build the caller asked 5 for. The
    // request is required input and is what Orbit priced.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { partial_profile: 1 },
    });
});

Deno.test({
    name:
        "orbit#v3/enrich/{profile_id} live: a partial build settles from the real card",
    ignore: liveSkip("orbit"),
    fn: async () => {
        const unit = await testSealedUnit("orbit#v3/enrich/{profile_id}");
        const result = await runEndpoint({
            unit,
            input: {
                pathParams: { profile_id: PROFILE },
                body: { operation: "partial" },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // A profile already at partial depth is a no-op and settles empty;
        // one Orbit has to build settles 5. Both are correct answers here,
        // so assert the pool rather than the number.
        const pools = Object.keys(result.usage.credits);
        assert(pools.length === 0 || pools.join() === "default", pools.join());
    },
});

Deno.test("orbit#v3/enrich/{profile_id}: a submit-time failure reads like a poll-time one", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich/{profile_id}");
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { profile_id: PROFILE },
            body: { operation: "full" },
        },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-enrich-failed-on-submit.json`,
        ),
    });

    // Same shape as the poll's failure path: the reason at `failure` is
    // lifted into Orbit's own error envelope so one mapper reads both.
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "sources_unavailable");
    assertEquals(output.message, "No readable sources for this person");
});
