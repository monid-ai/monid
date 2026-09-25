import { assert, assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

/**
 * Provenance for the brightdata provider — one per provider, not per
 * endpoint. Pins the three claims the design record makes that no single
 * endpoint test can see: which fns exist at all, that the two `auth.inject`
 * sources are DISTINCT (design D1 — the zone field is the product switch,
 * so they cannot intern to one entry), and the rate table.
 *
 * The rates are written as LITERALS on purpose (clay D7a): deriving them
 * from each doc's own model would make this a tautology, because the engine
 * folds credits FROM the model and an edited `consumes.amount` would move
 * both sides and pass.
 */
const IDS = ["brightdata#serp", "brightdata#unlocker"] as const;

/** $1.50 / 1,000 requests pay-as-you-go, both products
 *  (brightdata.com/pricing/serp and /pricing/web-unlocker, read
 *  2026-09-23). A new endpoint must state its row here. */
const RATE: Record<string, number> = {
    "brightdata#serp": 0.0015,
    "brightdata#unlocker": 0.0015,
};

Deno.test("brightdata docs: every endpoint is in the rate table", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("brightdata#"))
        .sort();
    assertEquals(ids, [...IDS]);
    assertEquals(Object.keys(RATE).sort(), ids);
});

Deno.test("brightdata docs: an own inject per endpoint, no meter, no reshaping, one rate", async () => {
    const bundle = await testBundle();
    for (const id of IDS) {
        const doc = bundle.endpoints[id];
        // the zone is injected at egress, so the inject is the endpoint's
        // own — authored inline, never a preset (design D1)
        assert(
            bundle.fnTable[doc.auth.inject.$fn.key].provenance.startsWith(
                "connectors/brightdata/endpoints/",
            ),
            `${id}: the inject must be authored on the endpoint`,
        );
        // no vendor meter anywhere (design D3)
        assertEquals(doc.usage.consolidate, undefined, id);
        // the payload reaches the caller as it came (design D5)
        assertEquals(doc.output.fromResponse, undefined, id);
        assertEquals(doc.output.fromError, undefined, id);
        // the validated input IS the wire body, plus the injected zone
        assertEquals(doc.input.toRequest, undefined, id);
        // both endpoints are synchronous
        assertEquals(doc.lifecycle, undefined, id);
        assertEquals(doc.usage.model, {
            kind: "PER_UNIT",
            unit: "RESULT",
            every: 1,
            label: "delivered requests",
            description: "requests that came back carrying a payload",
            consumes: { credit: "default", amount: RATE[id] },
        }, id);
        assertEquals(
            doc.usage.credits,
            { default: { label: "US dollars" } },
            id,
        );
        assertEquals(
            doc.request.url,
            "https://api.brightdata.com/request",
            id,
        );
        assertEquals(doc.request.method, "POST", id);
        assertEquals(doc.timeouts, { requestMs: 120_000, runMs: 125_000 }, id);
    }
});

Deno.test("brightdata docs: one delivery rule, interned — both endpoints share the estimate and the evidence", async () => {
    const bundle = await testBundle();
    const serp = bundle.endpoints["brightdata#serp"];
    const unlocker = bundle.endpoints["brightdata#unlocker"];
    // design D4 is ONE rule, so the two sources are byte-identical and
    // content-addressing must collapse them to a single fnTable entry
    assertEquals(
        serp.usage.evidence.$fn.key,
        unlocker.usage.evidence.$fn.key,
    );
    assertEquals(
        serp.usage.estimate.$fn.key,
        unlocker.usage.estimate.$fn.key,
    );
    // and they are authored here, never the compiler's empty synthesis
    for (const doc of [serp, unlocker]) {
        assert(
            bundle.fnTable[doc.usage.evidence.$fn.key].provenance.startsWith(
                "connectors/brightdata/endpoints/",
            ),
        );
    }
});

Deno.test("brightdata docs: the two injects are DISTINCT — the zone field is the product switch", async () => {
    const bundle = await testBundle();
    const serp = bundle.endpoints["brightdata#serp"];
    const unlocker = bundle.endpoints["brightdata#unlocker"];
    // design D1: identical sources would intern to one fnTable entry. These
    // read different credential fields, so they must NOT.
    assert(
        serp.auth.inject.$fn.key !== unlocker.auth.inject.$fn.key,
        "the serp and unlocker injects must not intern to one entry",
    );
    // and the credential shape carries both zones beside the key
    const credentials = serp.auth.credentials as {
        properties: Record<string, unknown>;
        required: string[];
    };
    assertEquals(Object.keys(credentials.properties).sort(), [
        "apiKey",
        "serpZone",
        "unlockerZone",
    ]);
    assertEquals(credentials.required.sort(), [
        "apiKey",
        "serpZone",
        "unlockerZone",
    ]);
});
