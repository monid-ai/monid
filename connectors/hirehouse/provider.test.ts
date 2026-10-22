import { assertEquals } from "@std/assert";
import { testSealedUnit } from "@shared/testing";

/** Provider-level facts every hirehouse endpoint inherits. Per-endpoint
 *  behavior lives in endpoints/<e>/endpoint.test.ts. */
const IDS = [
    "hirehouse#jobs/search",
    "hirehouse#jobs/{id}",
    "hirehouse#jobs/compare",
];

Deno.test("hirehouse: every endpoint is FREE, categorised jobs, and tags monid", async () => {
    for (const id of IDS) {
        const unit = await testSealedUnit(id);
        assertEquals(unit.doc.usage.model.kind, "FREE", id);
        assertEquals(unit.doc.meta.categories, ["jobs"], id);
        assertEquals(
            unit.doc.request.headers?.["X-HireHouse-Source"],
            "monid",
            id,
        );
    }
});
