import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("orbit#v3/enrich: the fan-out polls only what is running, then reads every child", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich");
    const result = await runEndpoint({
        unit,
        input: {
            body: { profile_ids: ["PROF_A", "PROF_B"], operation: "partial" },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-enrich-batch.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // CHILD_BUILT was dispatched and reached partial depth ⇒ 5 credits.
    // CHILD_HELD answered terminally on the submit — a profile already at
    // depth — and draws nothing.
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { partial_profile: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.request_id, "BATCH1");
    assertEquals(output.status, "completed");
    const rows = output.results as Record<string, unknown>[];
    assertEquals(rows.length, 2);
    assertEquals(rows[0].request_id, "CHILD_BUILT");
    assertEquals(rows[1].request_id, "CHILD_HELD");
});

Deno.test("orbit#v3/enrich estimate: the ceiling is the list, at the depth asked for", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich");
    const estimate = await estimateEndpoint(unit, {
        body: {
            profile_ids: ["PROF_A", "PROF_B", "PROF_C"],
            operation: "full",
        },
    });
    assertEquals(estimate, {
        credits: { default: 30 },
        evidence: { full_profile: 3 },
    });
});

Deno.test("orbit#v3/enrich: the vendor's cap of 20 is the mirror's cap", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich");
    const body = unit.doc.input.schema.body as {
        properties?: Record<string, { minItems?: number; maxItems?: number }>;
        required?: string[];
    };
    assertEquals(body.properties?.profile_ids.minItems, 1);
    assertEquals(body.properties?.profile_ids.maxItems, 20);
    assertEquals(body.required, ["profile_ids", "operation"]);
});

Deno.test("orbit#v3/enrich: a transient FINAL read re-opens the child instead of failing it", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich");
    const result = await runEndpoint({
        unit,
        input: {
            body: { profile_ids: ["PROF_A", "PROF_B"], operation: "partial" },
        },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-enrich-batch-final-transient.json`,
        ),
    });

    // The final read is the same lookup the poll makes. Publishing a
    // `failed` row on a 503 would both lie about the child and drop its
    // depth line from evidence — settling a build Orbit charged for at zero.
    assertEquals(result.httpStatus, 200);
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals((output.results as unknown[]).length, 2);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { partial_profile: 1 },
    });
});

Deno.test("orbit#v3/enrich: the gate rejects a 21st profile, and passes 20", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich");
    const fixture = await loadFixture(`${chains}synthetic-enrich-batch.json`);
    const ids = (count: number) =>
        Array.from({ length: count }, (_unused, index) => `PROF_${index}`);

    // NEAR-VALID and bad: one past the vendor's own cap.
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { profile_ids: ids(21), operation: "partial" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );

    // The near-twin at exactly the cap must pass, so the gate is not too
    // narrow either.
    await assertInputAccepted({
        unit,
        input: { body: { profile_ids: ids(20), operation: "partial" } },
        mode: "replay",
        fixture,
    });
});
