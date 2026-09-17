import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const A = "USC_T42_C21_S1983";
const CA = "STATE_CA_Cciv_D3_P4_T5_C2_S1950.7";

/**
 * Vaquill's PUBLISHED draw per endpoint, from
 * https://api.vaquill.ai/api/v1/api-credits/pricing (read 2026-09-17), as
 * each endpoint's recorded fixture settles it.
 *
 * Every row here agrees with the vendor's own `creditsConsumed` claim, so no
 * `mismatch` key appears and deep-equality against the strict `zUsage`
 * proves it. That agreement is the point of the table: it is the only thing
 * that catches our pinned rates drifting from the live card. Written as
 * LITERALS on purpose: deriving them from each doc's own model would make
 * the test a tautology. A new endpoint states its row here.
 */
const RATE: Record<
    string,
    { fixture: string; input: RunInput; usage: Record<string, unknown> }
> = {
    "vaquill#us/statutes/search": {
        fixture: "search-ok",
        input: {
            body: {
                query: "insider trading penalties",
                limit: 2,
                fields: [
                    "actId",
                    "citation",
                    "title",
                    "excerpt",
                    "corpusType",
                    "state",
                    "goodLawStatus",
                ],
            },
        },
        usage: { credits: { default: 4 }, evidence: { call: 1 } },
    },
    "vaquill#us/statutes/sections": {
        fixture: "sections-partial-ok",
        input: { body: { actIds: [A, "USC_T99_C99_S9999"] } },
        usage: { credits: { default: 2 }, evidence: { section: 1 } },
    },
    "vaquill#us/statutes/resolve": {
        fixture: "resolve-partial-ok",
        input: { body: { citations: ["42 U.S.C. 1983", "99 Z.Z.C. 12345"] } },
        usage: { credits: { default: 4 }, evidence: { RESULT: 2 } },
    },
    "vaquill#us/statutes/count": {
        fixture: "count-ok",
        input: { body: { corpusType: "USC", titleNumber: 42 } },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
    "vaquill#us/statutes/divisions": {
        fixture: "divisions-ok",
        input: {
            queryParams: {
                corpusType: "USC",
                titleNumber: 42,
                chapter: "21",
            },
        },
        usage: { credits: { default: 1 }, evidence: { RESULT: 1 } },
    },
    "vaquill#us/statutes/coverage": {
        fixture: "coverage-ok",
        input: {},
        usage: { credits: {}, evidence: {} },
    },
    "vaquill#us/statutes/section/{act_id}": {
        fixture: "section-ok",
        input: { pathParams: { act_id: A } },
        usage: { credits: { default: 2 }, evidence: { CALL: 1 } },
    },
    "vaquill#us/statutes/section/{act_id}/body": {
        fixture: "body-ok",
        input: { pathParams: { act_id: A }, queryParams: { format: "plain" } },
        usage: { credits: { default: 6 }, evidence: { CALL: 1 } },
    },
    "vaquill#us/statutes/section/{act_id}/related": {
        fixture: "related-ok",
        input: { pathParams: { act_id: A }, queryParams: { limit: 1 } },
        usage: { credits: { default: 2 }, evidence: { CALL: 1 } },
    },
    "vaquill#us/statutes/section/{act_id}/changes": {
        fixture: "changes-ok",
        input: { pathParams: { act_id: A }, queryParams: { limit: 3 } },
        usage: { credits: { default: 1 }, evidence: { CALL: 1 } },
    },
    "vaquill#us/statutes/section/{act_id}/cited-by": {
        fixture: "cited-by-ok",
        input: { pathParams: { act_id: A }, queryParams: { limit: 2 } },
        usage: { credits: { default: 2 }, evidence: { RESULT: 1 } },
    },
    "vaquill#us/statutes/section/{act_id}/definitions": {
        fixture: "definitions-ok",
        input: { pathParams: { act_id: A } },
        usage: { credits: { default: 4 }, evidence: { RESULT: 1 } },
    },
    "vaquill#us/statutes/section/{act_id}/cross-state": {
        fixture: "cross-state-ok",
        input: { pathParams: { act_id: CA }, queryParams: { limit: 3 } },
        usage: { credits: { default: 6 }, evidence: { RESULT: 1 } },
    },
};

/**
 * The five endpoints Vaquill REFUNDS when the answer comes back empty,
 * each with the fixture that recorded the refund. This is the reason those
 * five are metered rather than flat: a flat model folds to its list price,
 * a zero claim prunes to an empty claim, an empty claim falls back to the
 * fold, and the caller is billed for a call the vendor did not charge for.
 */
const REFUNDED: Record<string, { fixture: string; input: RunInput }> = {
    "vaquill#us/statutes/count": {
        fixture: "count-empty-ok",
        input: { body: { corpusType: "USC", titleNumber: 99 } },
    },
    "vaquill#us/statutes/divisions": {
        fixture: "divisions-empty-ok",
        input: { queryParams: { corpusType: "USC", titleNumber: 99 } },
    },
    "vaquill#us/statutes/section/{act_id}/cited-by": {
        fixture: "cited-by-empty-ok",
        input: { pathParams: { act_id: CA } },
    },
    "vaquill#us/statutes/section/{act_id}/definitions": {
        fixture: "definitions-empty-ok",
        input: { pathParams: { act_id: CA } },
    },
    "vaquill#us/statutes/section/{act_id}/cross-state": {
        fixture: "cross-state-empty-ok",
        input: { pathParams: { act_id: A }, queryParams: { limit: 3 } },
    },
};

const vaquillIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("vaquill#"))
        .sort();
};

Deno.test("vaquill: the literal rate table covers exactly the compiled endpoints", async () => {
    const ids = await vaquillIds();
    assertEquals(ids.length, 13);
    assertEquals(ids, Object.keys(RATE).sort());
});

Deno.test("vaquill: every endpoint settles its published draw, and the receipt leaves the payload", async () => {
    for (const [id, { fixture, input, usage }] of Object.entries(RATE)) {
        const unit = await testSealedUnit(id);
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture: await loadFixture(`${FIXTURES}${fixture}.json`),
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        // deep-equal on the WHOLE usage: an absent `mismatch` key is the
        // assertion that our pinned rate and the vendor's own claim agree
        assertEquals(result.usage, usage, id);
        assertEquals(
            "creditsConsumed" in (result.output as Record<string, Json>),
            false,
            id,
        );
        // `pluck` is EXACT, so a receipt nested under `meta` survives it.
        // Coverage is the one endpoint that reports there, and it reports 0
        // because it is free. Asserting only the root would let a metered
        // endpoint hide a live receipt one level down.
        const meta = (result.output as Record<string, Json>).meta;
        if (meta !== undefined && meta !== null && typeof meta === "object") {
            const nested = (meta as Record<string, Json>).creditsConsumed;
            assertEquals(nested ?? 0, 0, `${id} carries a nested receipt`);
        }
    }
});

Deno.test("vaquill: a refunded miss settles at nothing, not at the list price", async () => {
    for (const [id, { fixture, input }] of Object.entries(REFUNDED)) {
        const unit = await testSealedUnit(id);
        const loaded = await loadFixture(`${FIXTURES}${fixture}.json`);
        // the fixture really did record a zero charge, not an absent one
        assertEquals(
            (loaded.calls[0].res.body as Record<string, Json>).creditsConsumed,
            0,
            fixture,
        );
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture: loaded,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, {
            credits: {},
            evidence: { RESULT: 0 },
        }, id);
    }
});

Deno.test("vaquill: an unmetered response falls back to the derived fold", async () => {
    const id = "vaquill#us/statutes/section/{act_id}/body";
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(`${FIXTURES}body-ok.json`);
    delete (fixture.calls[0].res.body as Record<string, Json>).creditsConsumed;
    const result = await runEndpoint({
        unit,
        input: RATE[id].input,
        mode: "replay",
        fixture,
    });
    // no claim at all is not the same as a zero claim: the model's flat 6
    // is the bill (design D27)
    assertEquals(result.usage, {
        credits: { default: 6 },
        evidence: { CALL: 1 },
    });
});

Deno.test("vaquill: usage fn provenance: one auth, one consolidate, eight own evidence fns", async () => {
    const bundle = await testBundle();
    const ids = await vaquillIds();
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        // the `creditsConsumed` receipt is a PROVIDER-wide fact: one
        // consolidate key across all thirteen
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            first.usage.consolidate?.$fn.key,
            id,
        );
        // the validated input IS the wire request on every endpoint
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
    }
    // the metered docs own their evidence; the flat and free ones are
    // compiler-synthesized
    const own = ids.filter((id) =>
        bundle.fnTable[bundle.endpoints[id].usage.evidence.$fn.key]
            .provenance !== "core#usage.synthesizedEmpty"
    );
    assertEquals(own.sort(), [
        "vaquill#us/statutes/count",
        "vaquill#us/statutes/divisions",
        "vaquill#us/statutes/resolve",
        "vaquill#us/statutes/search",
        "vaquill#us/statutes/section/{act_id}/cited-by",
        "vaquill#us/statutes/section/{act_id}/cross-state",
        "vaquill#us/statutes/section/{act_id}/definitions",
        "vaquill#us/statutes/sections",
    ]);
});

Deno.test("vaquill: every endpoint stays on the documented base url", async () => {
    const bundle = await testBundle();
    for (const id of await vaquillIds()) {
        const url = bundle.endpoints[id].request.url;
        assert(
            url.startsWith("https://api.vaquill.ai/api/v1/us/statutes/"),
            `${id} left the documented US statutes surface: ${url}`,
        );
    }
});
