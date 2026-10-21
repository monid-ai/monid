import { assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

/**
 * Provenance, once per provider: every DansUGC doc shares the provider's
 * bearer inject and `{error}` digest, calls dansugc.com/api/v1, and only the
 * purchase carries a meter (its own `total_amount` claim). A new endpoint
 * must state its place here.
 */
Deno.test("dansugc: fn provenance — one inject, one fromError, the purchase's own claim", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("dansugc#"))
        .sort();
    assertEquals(ids, [
        "dansugc#broll",
        "dansugc#broll/filters",
        "dansugc#broll/purchase",
        "dansugc#broll/{videoId}",
    ]);
    const search = bundle.endpoints["dansugc#broll"];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, search.auth.inject.$fn.key, id);
        assertEquals(
            doc.output.fromError?.$fn.key,
            search.output.fromError?.$fn.key,
            id,
        );
        assertEquals(
            doc.request.url.startsWith("https://dansugc.com/api/v1/broll"),
            true,
            id,
        );
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
    }
    assertEquals(
        ids.filter((id) =>
            bundle.endpoints[id].usage.consolidate !== undefined
        ),
        ["dansugc#broll/purchase"],
    );
    assertEquals(
        ids.filter((id) => bundle.endpoints[id].usage.model.kind !== "FREE"),
        ["dansugc#broll/purchase"],
    );
});
