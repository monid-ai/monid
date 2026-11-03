import { assert, assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

Deno.test("fundmomentum: 7 endpoints share one auth fn, one lifecycle.start, one credit pool", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("fundmomentum#")
    ).sort();
    assertEquals(ids, [
        "fundmomentum#mcp/check_lp_coverage",
        "fundmomentum#mcp/get_changes",
        "fundmomentum#mcp/get_fund",
        "fundmomentum#mcp/get_usage",
        "fundmomentum#mcp/search_funds",
        // Added 2026-11-04: the vendor retired this tool's standalone
        // LP Radar subscription gate, so it's now wired in here too —
        // see search-lps/endpoint.ts and schema/inputs.ts.
        "fundmomentum#mcp/search_lps",
        "fundmomentum#mcp/send_feedback",
    ]);

    const docs = ids.map((id) => bundle.endpoints[id]);
    for (const doc of docs) {
        assertEquals(doc.request.method, "POST");
        assertEquals(doc.request.url, "https://fundmomentum.vc/_api/mcp");
        assertEquals(
            doc.auth.inject.$fn.key,
            docs[0].auth.inject.$fn.key,
            doc.id,
        );
        assert(
            doc.lifecycle?.start !== undefined,
            `${doc.id} has lifecycle.start`,
        );
        assertEquals(
            doc.lifecycle.start.$fn.key,
            docs[0].lifecycle!.start!.$fn.key,
            doc.id,
        );
    }

    const kinds: Record<string, string> = {
        "fundmomentum#mcp/check_lp_coverage": "FREE",
        "fundmomentum#mcp/get_changes": "PER_CALL",
        "fundmomentum#mcp/get_fund": "PER_CALL",
        // Added 2026-10-24, both FREE like check_lp_coverage.
        "fundmomentum#mcp/get_usage": "FREE",
        "fundmomentum#mcp/send_feedback": "FREE",
        // Re-verified live 2026-10-17: billed per fund returned (1
        // credit each, minimum 1), not a flat per-call price — see
        // search-funds/endpoint.ts.
        "fundmomentum#mcp/search_funds": "PER_UNIT",
        // Added 2026-11-04, billed per LP row returned — see
        // search-lps/endpoint.ts.
        "fundmomentum#mcp/search_lps": "PER_UNIT",
    };
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.usage.model.kind, kinds[id], id);
        if (kinds[id] === "PER_CALL" || kinds[id] === "PER_UNIT") {
            assertEquals(Object.keys(doc.usage.credits), ["default"], id);
        }
    }

    // All four share the provider-level usage.consolidate (the
    // vendor's own _meta.credits_charged receipt), not just
    // lifecycle.start.
    assert(
        bundle.endpoints[ids[0]].usage.consolidate !== undefined,
        "provider declares usage.consolidate",
    );
    for (const id of ids) {
        assertEquals(
            bundle.endpoints[id].usage.consolidate?.$fn.key,
            bundle.endpoints[ids[0]].usage.consolidate?.$fn.key,
            id,
        );
    }
});
