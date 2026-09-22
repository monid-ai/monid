import { assert, assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

/**
 * Provider-level guard for the growsurf connector.
 *
 * Three claims, all of which would be quiet failures if they ever stopped
 * being true: every endpoint is FREE and stays FREE; every endpoint speaks
 * to api.growsurf.com and nowhere else; and the identity of each endpoint
 * is the vendor's own path, because those ids are public API.
 */

/** The published identities, and the urls they must compile to. */
const ENDPOINTS: Record<string, string> = {
    "growsurf#campaigns": "https://api.growsurf.com/v2/campaigns",
    "growsurf#campaign/{id}": "https://api.growsurf.com/v2/campaign/{id}",
    "growsurf#campaign/{id}/participants":
        "https://api.growsurf.com/v2/campaign/{id}/participants",
    "growsurf#campaign/{id}/leaderboard":
        "https://api.growsurf.com/v2/campaign/{id}/leaderboard",
    "growsurf#campaign/{id}/analytics":
        "https://api.growsurf.com/v2/campaign/{id}/analytics",
    "growsurf#campaign/{id}/participant":
        "https://api.growsurf.com/v2/campaign/{id}/participant",
    "growsurf#campaign/{id}/participant/{participantIdOrEmail}":
        "https://api.growsurf.com/v2/campaign/{id}/participant/" +
        "{participantIdOrEmail}",
    "growsurf#campaign/{id}/participant/{participantIdOrEmail}/ref":
        "https://api.growsurf.com/v2/campaign/{id}/participant/" +
        "{participantIdOrEmail}/ref",
    "growsurf#campaign/{id}/participant/{participantIdOrEmail}/transaction":
        "https://api.growsurf.com/v2/campaign/{id}/participant/" +
        "{participantIdOrEmail}/transaction",
};

Deno.test("growsurf: nine endpoints, each identified by the vendor's own path", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("growsurf#")
    ).sort();
    assertEquals(ids, Object.keys(ENDPOINTS).sort());

    for (const [id, url] of Object.entries(ENDPOINTS)) {
        // no endpoint declares an explicit `endpoint` — the wire path IS
        // the identity here (design D22), so a vendor route move would
        // rename the id and `deno task ids:check` would say so
        assertEquals(bundle.endpoints[id].request.url, url, id);
    }
});

Deno.test("growsurf: every endpoint is FREE, with no meter to read", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(ENDPOINTS);
    const synthesized = bundle.endpoints[ids[0]].usage.evidence.$fn.key;

    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.usage.model.kind, "FREE", id);
        // GrowSurf reports no per-call meter, so no consolidate fn
        // compiles at all and both quantities slots are the ONE
        // compiler-synthesized `() => ({counts: {}})` entry
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(doc.usage.evidence.$fn.key, synthesized, id);
        assertEquals(doc.usage.estimate.$fn.key, synthesized, id);
    }
    assertEquals(
        bundle.fnTable[synthesized].provenance,
        "core#usage.synthesizedEmpty",
    );
});

Deno.test("growsurf: one bearer inject, no wire layer anywhere", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(ENDPOINTS);
    const inject = bundle.endpoints[ids[0]].auth.inject.$fn.key;

    for (const id of ids) {
        const doc = bundle.endpoints[id];
        // one interned entry for all nine: the key is a plain
        // `Authorization: Bearer` header on every route
        assertEquals(doc.auth.inject.$fn.key, inject, id);
        // the validated input IS the wire request and the vendor's body IS
        // the output — no endpoint reshapes either
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
        assertEquals(doc.output.fromError, undefined, id);
        assertEquals(doc.lifecycle, undefined, id);
    }
    assertEquals(bundle.fnTable[inject].provenance, "presets#auth.bearer");
});

Deno.test("growsurf: the money in these payloads is the customer's, so nothing bills", async () => {
    const bundle = await testBundle();
    // the one endpoint that moves real commission liability is still
    // FREE to call — worth pinning on its own, because a future author
    // adding a usage model here would be billing for someone else's sale
    const sale = bundle.endpoints[
        "growsurf#campaign/{id}/participant/{participantIdOrEmail}/transaction"
    ];
    assertEquals(sale.usage.model.kind, "FREE");
    assert(
        sale.meta.notes?.some((note) => note.includes("identifier")),
        "the de-duplication caveat is on the doc a caller inspects",
    );
});
