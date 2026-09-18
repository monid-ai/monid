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

Deno.test("orbit#v3/search/{search_id}: reading a search bills NOTHING", async () => {
    const unit = await testSealedUnit("orbit#v3/search/{search_id}");
    const result = await runEndpoint({
        unit,
        input: { pathParams: { search_id: "SEARCH1" } },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-search-status-read.json`,
        ),
    });

    // The search was billed by the run that started it. Re-reading its
    // snapshot — which a caller following a long search does repeatedly —
    // must never re-bill it.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });

    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "completed");
    // The vendor's envelope rides through whole — the result count is the
    // fixture's, and no billing field is invented or stripped on the way.
    const rows = output.results as Record<string, unknown>[];
    assertEquals(rows.length, 1);
    assertEquals(rows[0].profile_id, "PROF_INDEXED_1");
    for (const field of ["billing", "credits", "usage", "consumed_credits"]) {
        assertEquals(field in output, false, `${field} must not appear`);
    }
});

Deno.test("orbit#v3/search/{search_id}: a vendor refusal is zero-billed data", async () => {
    const unit = await testSealedUnit("orbit#v3/search/{search_id}");
    const result = await runEndpoint({
        unit,
        input: { pathParams: { search_id: "UNKNOWN" } },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-search-status-error.json`,
        ),
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "search_not_found");
});

Deno.test("orbit#v3/search/{search_id}: the id is required and is the whole input", async () => {
    const unit = await testSealedUnit("orbit#v3/search/{search_id}");
    const schema = unit.doc.input.schema;
    assertEquals(schema.pathParams?.required, ["search_id"]);
    assertEquals(schema.body, undefined);
    assertEquals(schema.queryParams, undefined);
    assert(
        unit.doc.request.url.endsWith("/{search_id}"),
        "the placeholder must survive url normalization unencoded",
    );
});

Deno.test({
    name:
        "orbit#v3/search/{search_id} live: an unknown id answers, and bills nothing",
    ignore: liveSkip("orbit"),
    fn: async () => {
        const unit = await testSealedUnit("orbit#v3/search/{search_id}");
        const result = await runEndpoint({
            unit,
            input: {
                pathParams: {
                    search_id: "00000000-0000-4000-8000-000000000000",
                },
            },
            mode: "live",
        });
        // SHAPE, not amounts: a status read declares no credit system, so
        // whichever way Orbit answers an id this key cannot see, the run
        // draws on no pool.
        assertEquals(Object.keys(result.usage.credits).length, 0);
        assert(
            typeof result.httpStatus === "number",
            "the read answered with a status",
        );
    },
});
