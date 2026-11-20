import { assert, assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

/**
 * Provenance of the four Loyaltie docs. Every endpoint is one `tools/call`
 * against the same public MCP server, so the provider-level pieces (auth
 * pass-through, the JSON-RPC unwrap in `output.fromResponse`, the FREE
 * model) must intern to ONE content-addressed fn each, while each endpoint
 * keeps its OWN `input.toRequest` (it names its own tool). Literals on
 * purpose: deriving them from the docs would make the test a tautology.
 */
const IDS = [
    "loyaltie#search-catalog",
    "loyaltie#get-product",
    "loyaltie#get-maker",
    "loyaltie#build-cart-link",
] as const;

Deno.test("loyaltie provenance: one wire, one unwrap, FREE; per-endpoint request builders", async () => {
    const bundle = await testBundle();
    const docs = IDS.map((id) => {
        const doc = bundle.endpoints[id];
        assert(doc !== undefined, `${id} is in the bundle`);
        return doc;
    });
    const loyaltieIds = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("loyaltie#")).sort();
    assertEquals(loyaltieIds, [...IDS].sort());

    for (const doc of docs) {
        assertEquals(doc.request.method, "POST");
        assertEquals(doc.request.url, "https://loyaltie.com/api/ucp/mcp");
        assertEquals(doc.usage.model, { kind: "FREE" });
        assertEquals(doc.meta.categories, ["shopping"]);
        assertEquals(doc.timeouts.requestMs, 30_000);
    }
    const [first, ...rest] = docs;
    for (const doc of rest) {
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key);
        assertEquals(
            doc.output.fromResponse?.$fn.key,
            first.output.fromResponse?.$fn.key,
        );
    }
    const builders = new Set(docs.map((doc) => doc.input.toRequest?.$fn.key));
    assertEquals(builders.size, IDS.length);
});
