import { assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

/**
 * kosa8 provider-wide provenance. The endpoint suites live next to their
 * endpoints (`endpoints/<name>/endpoint.test.ts`); the sandbox resource's
 * suite is `resources/sandbox/resource.test.ts`.
 */

Deno.test("kosa8: provenance — one auth fn, one cost_usd strip, synthesized FREE usage", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("kosa8#")
    ).sort();
    assertEquals(ids, [
        "kosa8#create-sandbox",
        "kosa8#delete-sandbox",
        "kosa8#exec",
        "kosa8#get-sandbox",
        "kosa8#list-templates",
        "kosa8#sleep-sandbox",
        "kosa8#wake-sandbox",
    ]);
    const first = bundle.endpoints[ids[0]];
    // the provider's bearer inject and its `cost_usd` strip are ONE fn
    // each, shared by all seven docs
    assertEquals(
        bundle.fnTable[first.auth.inject.$fn.key].provenance,
        "presets#auth.bearer",
    );
    const strip = first.output.fromResponse?.$fn.key;
    assertEquals(
        strip !== undefined && bundle.fnTable[strip].provenance,
        "connectors/kosa8/provider.ts#output.fromResponse",
    );
    // every run is FREE and declares no usage fn of its own: estimate and
    // evidence are the compiler-synthesized empty fn
    const synthesized = first.usage.evidence.$fn.key;
    assertEquals(
        bundle.fnTable[synthesized].provenance,
        "core#usage.synthesizedEmpty",
    );
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(doc.output.fromResponse?.$fn.key, strip, id);
        assertEquals(doc.usage.model.kind, "FREE", id);
        assertEquals(doc.usage.evidence.$fn.key, synthesized, id);
        assertEquals(doc.usage.estimate.$fn.key, synthesized, id);
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(
            doc.request.url.startsWith("https://api.kosa8.com/v1/"),
            true,
            id,
        );
    }
});
