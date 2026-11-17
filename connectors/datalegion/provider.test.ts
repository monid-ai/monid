import { assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";
import { DATALEGION_KEYS } from "./schema/auth.ts";

/** The rate card (design D2): each product sends its own key and draws
 *  from that key's pool. v1 USD per call, for the broker card: 0.013,
 *  0.065, 0.052, 0.104, 0.013, 0.052 in this order. */
const PRODUCTS: Record<string, { key: string; pool: string }> = {
    "datalegion#person/enrich/base/no-pii": {
        key: "personBaseNoPiiApiKey",
        pool: "person_base_no_pii",
    },
    "datalegion#person/enrich/base/pii": {
        key: "personBasePiiApiKey",
        pool: "person_base_pii",
    },
    "datalegion#person/enrich/premium/no-pii": {
        key: "personPremiumNoPiiApiKey",
        pool: "person_premium_no_pii",
    },
    "datalegion#person/enrich/premium/pii": {
        key: "personPremiumPiiApiKey",
        pool: "person_premium_pii",
    },
    "datalegion#company/enrich/base": {
        key: "companyBaseApiKey",
        pool: "company_base",
    },
    "datalegion#company/enrich/premium": {
        key: "companyPremiumApiKey",
        pool: "company_premium",
    },
};

Deno.test("datalegion: six keys — one credential object on every doc, and each product's inject sends its own key", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("datalegion#")
    ).sort();
    assertEquals(ids, Object.keys(PRODUCTS).sort());
    const injects = new Set<string>();
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        // ONE object with all six keys (v1 parity), declared on the
        // provider and inherited by every doc
        assertEquals(
            (doc.auth.credentials as { required?: string[] }).required,
            [...DATALEGION_KEYS],
            id,
        );
        // the key IS the product: a copy-paste slip here bills one
        // product's rate and returns another's fields
        const src = bundle.fnTable[doc.auth.inject.$fn.key].src;
        assertEquals(
            DATALEGION_KEYS.filter((key) => src.includes(`data.params.${key}`)),
            [PRODUCTS[id].key],
            id,
        );
        injects.add(doc.auth.inject.$fn.key);
    }
    assertEquals(injects.size, 6);
});

Deno.test("datalegion: rate literals — every product draws exactly 1 credit per call from its own key's pool (no consolidate, so the tests hold the card)", async () => {
    const bundle = await testBundle();
    for (const [id, { pool }] of Object.entries(PRODUCTS)) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.usage.consolidate, undefined, id);
        const model = doc.usage.model as {
            kind: string;
            consumes: { credit: string; amount: number };
        };
        assertEquals(model.kind, "PER_CALL", id);
        assertEquals(model.consumes, { credit: pool, amount: 1 }, id);
        // each doc narrows to the pool its own line drains (pdl D6)
        assertEquals(Object.keys(doc.usage.credits), [pool], id);
    }
});
