import { assert, assertEquals } from "@std/assert";
import { testBundle, testSealedUnit } from "@shared/testing";

const ENDPOINTS = [
    "zensched#guide",
    "zensched#account-create",
    "zensched#feedback-submit",
] as const;

Deno.test("zensched docs: one auth inject, one lifecycle.start, one fromResponse", async () => {
    const bundle = await testBundle();
    const first = bundle.endpoints[ENDPOINTS[0]];
    for (const id of ENDPOINTS) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            doc.lifecycle?.start.$fn.key,
            first.lifecycle?.start.$fn.key,
            id,
        );
        assertEquals(
            doc.output.fromResponse?.$fn.key,
            first.output.fromResponse?.$fn.key,
            id,
        );
        assertEquals(doc.lifecycle?.poll, undefined, id);
        assertEquals(doc.usage.model, { kind: "FREE" }, id);
        assertEquals(doc.usage.consolidate, undefined, id);
    }
});

Deno.test("zensched sealed units: provider lifecycle.start resolves on every endpoint", async () => {
    const units = await Promise.all(ENDPOINTS.map((id) => testSealedUnit(id)));
    const startKey = units[0].doc.lifecycle?.start.$fn.key;
    assert(startKey !== undefined, "provider lifecycle.start must resolve");
    for (const unit of units) {
        assertEquals(unit.doc.lifecycle?.start.$fn.key, startKey);
    }
});
