import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./endpoints/", import.meta.url));

const CASES: Record<string, { dir: string; input: Record<string, unknown> }> = {
    "datacircle#apis": { dir: "apis", input: {} },
    "datacircle#apis/{slug}/best": {
        dir: "apis-best",
        input: {
            pathParams: { slug: "linkedin-profile" },
            queryParams: { limit: 2 },
        },
    },
    "datacircle#plans": {
        dir: "plans",
        input: { queryParams: { api: "linkedin-profile", limit: 2 } },
    },
    "datacircle#providers/{slug}": {
        dir: "providers-show",
        input: { pathParams: { slug: "bridgly" } },
    },
};

Deno.test("datacircle: four free GETs on one open host", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("datacircle#")
    ).sort();
    assertEquals(ids, Object.keys(CASES).sort());
    for (const id of ids) {
        assertEquals(bundle.endpoints[id].request.method, "GET", id);
        assertEquals(bundle.endpoints[id].usage.model.kind, "FREE", id);
    }
});

for (const [id, c] of Object.entries(CASES)) {
    Deno.test(`${id} happy (synthetic): free — zero usage`, async () => {
        const unit = await testSealedUnit(id);
        const fixture = await loadFixture(
            `${HERE}${c.dir}/fixtures/synthetic-happy.json`,
        );
        const result = await runEndpoint({
            unit,
            input: c.input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
}
