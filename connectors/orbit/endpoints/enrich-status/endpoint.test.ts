import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("orbit#v3/enrich/requests/{request_id}: reading a build bills NOTHING", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich/requests/{request_id}");
    const result = await runEndpoint({
        unit,
        input: { pathParams: { request_id: "ENRICH1" } },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-enrich-status-read.json`,
        ),
    });

    // The build was billed by the run that started it. A caller following a
    // long build reads this repeatedly, and a batch child is read here too —
    // so it must never re-bill.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });

    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    assertEquals(output.generation_level, 3);
    // The vendor's envelope rides through whole: one profile, with its
    // sections, and no billing field invented or stripped on the way.
    const profile = output.profile as Record<string, unknown>;
    assertEquals((profile.sections as unknown[]).length, 1);
    for (const field of ["billing", "credits", "usage", "consumed_credits"]) {
        assertEquals(field in output, false, `${field} must not appear`);
    }
});

Deno.test("orbit#v3/enrich/requests/{request_id}: a vendor refusal is zero-billed data", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich/requests/{request_id}");
    const result = await runEndpoint({
        unit,
        input: { pathParams: { request_id: "UNKNOWN" } },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-enrich-status-error.json`,
        ),
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "enrich_request_not_found",
    );
});

Deno.test("orbit#v3/enrich/requests/{request_id}: the gate rejects an empty id, and passes a real one", async () => {
    const unit = await testSealedUnit("orbit#v3/enrich/requests/{request_id}");
    const fixture = await loadFixture(
        `${chains}synthetic-enrich-status-read.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { request_id: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { pathParams: { request_id: "ENRICH1" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "orbit#v3/enrich/requests/{request_id} live: an unknown id answers, and bills nothing",
    ignore: liveSkip("orbit"),
    fn: async () => {
        const unit = await testSealedUnit(
            "orbit#v3/enrich/requests/{request_id}",
        );
        const result = await runEndpoint({
            unit,
            input: {
                pathParams: {
                    request_id: "00000000-0000-4000-8000-000000000000",
                },
            },
            mode: "live",
        });
        // SHAPE, not amounts: a status read declares no credit system.
        assertEquals(Object.keys(result.usage.credits).length, 0);
        assert(typeof result.httpStatus === "number");
    },
});
