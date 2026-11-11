import { assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";
import { replay, type TombaId } from "./test-data.ts";

/**
 * Tomba's published draw per endpoint, on each endpoint's happy chain
 * (docs.tomba.io/usage-and-quotas#credit-costs, 2026-11-11): the
 * requested-limit blocks of domain-search and similar, 1 search credit
 * per finder / enrichment hit (2 for combined), 5 per phone lookup by
 * email, 1 per phone validation and company-search page, 1 verification
 * credit per definitive verdict, 1 email count credit per count / format /
 * location call, 1 sources credit per sources hit, and zero for the three
 * free lookups. Tomba reports no meter, so no `mismatch` key appears
 * anywhere (zUsage is strict; deep-equality proves it). Written as
 * LITERALS on purpose (clay D7a): deriving them from each doc's own model
 * would make this test a tautology. A new endpoint must state its row here.
 */
const RATE: Record<TombaId, Record<string, unknown>> = {
    "tomba#domain-search": {
        credits: { search: 1 },
        evidence: { results: 10, phones: 0 },
    },
    "tomba#email-finder": {
        credits: { search: 1 },
        evidence: { lookup: 1, phones: 0 },
    },
    "tomba#author-finder": {
        credits: { search: 1 },
        evidence: { RESULT: 1 },
    },
    "tomba#linkedin": {
        credits: { search: 1 },
        evidence: { lookup: 1, phones: 0 },
    },
    "tomba#enrich": {
        credits: { search: 1 },
        evidence: { lookup: 1, phones: 0 },
    },
    "tomba#email-verifier": {
        credits: { verification: 1 },
        evidence: { verification: 1, phones: 0 },
    },
    "tomba#phone-finder": {
        credits: { search: 5 },
        evidence: { lookup: 1, domain_lookup: 0 },
    },
    "tomba#phone-validator": {
        credits: { search: 1 },
        evidence: { CALL: 1 },
    },
    "tomba#reveal/search": {
        credits: { search: 1 },
        evidence: { PAGE: 1 },
    },
    "tomba#similar": {
        credits: { search: 1 },
        evidence: { RESULT: 10 },
    },
    "tomba#people/find": {
        credits: { search: 1 },
        evidence: { RESULT: 1 },
    },
    "tomba#companies/find": {
        credits: { search: 1 },
        evidence: { RESULT: 1 },
    },
    "tomba#combined/find": {
        credits: { search: 2 },
        evidence: { RESULT: 1 },
    },
    "tomba#email-count": {
        credits: { email_count: 1 },
        evidence: { CALL: 1 },
    },
    "tomba#email-format": {
        credits: { email_count: 1 },
        evidence: { CALL: 1 },
    },
    "tomba#location": {
        credits: { email_count: 1 },
        evidence: { CALL: 1 },
    },
    "tomba#email-sources": {
        credits: { sources: 1 },
        evidence: { RESULT: 1 },
    },
    "tomba#technology": { credits: {}, evidence: {} },
    "tomba#domain-suggestions": { credits: {}, evidence: {} },
    "tomba#domain-status": { credits: {}, evidence: {} },
};

const tombaIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("tomba#"))
        .sort();
};

Deno.test("tomba: the literal rate table covers exactly the compiled endpoints", async () => {
    const ids = await tombaIds();
    assertEquals(ids.length, 20);
    assertEquals(ids, Object.keys(RATE).sort());
});

Deno.test("tomba: every endpoint's happy run settles its published draw", async () => {
    for (const [id, usage] of Object.entries(RATE)) {
        const { result, fixture } = await replay(id as TombaId, "happy");
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, usage, id);
        // no fromResponse anywhere: the vendor body relays untouched
        assertEquals(result.output, fixture.calls[0].res.body, id);
    }
});

Deno.test("tomba: provenance — one inject, one fromError, the pool set, the metered docs' own evidence", async () => {
    const bundle = await testBundle();
    const ids = await tombaIds();
    const count = bundle.endpoints["tomba#email-count"];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, count.auth.inject.$fn.key, id);
        assertEquals(
            doc.output.fromError?.$fn.key,
            count.output.fromError?.$fn.key,
            id,
        );
        assertEquals(
            doc.request.url.startsWith("https://api.tomba.io/v1/"),
            true,
            id,
        );
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(doc.lifecycle, undefined, id);
        assertEquals(doc.timeouts, { requestMs: 180_000, runMs: 200_000 }, id);
    }
    // every declared pool is drained somewhere (design D2)
    const pools = new Set(
        ids.flatMap((id) =>
            Object.keys(bundle.endpoints[id].usage.credits ?? {})
        ),
    );
    assertEquals([...pools].sort(), [
        "email_count",
        "search",
        "sources",
        "verification",
    ]);
    // the email verifier is the ONE doc draining two pools
    assertEquals(
        Object.keys(bundle.endpoints["tomba#email-verifier"].usage.credits)
            .sort(),
        ["search", "verification"],
    );
    // email-finder and enrich share ONE estimate and ONE evidence fn
    // (schema/finder.ts); linkedin keeps its own (full=true arrays)
    const finder = bundle.endpoints["tomba#email-finder"].usage;
    const enrich = bundle.endpoints["tomba#enrich"].usage;
    const linkedin = bundle.endpoints["tomba#linkedin"].usage;
    assertEquals(finder.evidence.$fn.key, enrich.evidence.$fn.key);
    assertEquals(finder.estimate.$fn.key, enrich.estimate.$fn.key);
    assertEquals(
        finder.evidence.$fn.key !== linkedin.evidence.$fn.key,
        true,
    );
    // the metered docs state their own evidence; the flat and free docs
    // carry the provider's / the synthesized one
    const flat = [
        "tomba#domain-status",
        "tomba#domain-suggestions",
        "tomba#email-count",
        "tomba#email-format",
        "tomba#location",
        "tomba#phone-validator",
        "tomba#technology",
    ];
    for (const id of flat) {
        assertEquals(
            bundle.endpoints[id].usage.evidence.$fn.key,
            count.usage.evidence.$fn.key,
            id,
        );
    }
    for (const id of ids.filter((id) => !flat.includes(id))) {
        assertEquals(
            bundle.endpoints[id].usage.evidence.$fn.key !==
                count.usage.evidence.$fn.key,
            true,
            id,
        );
    }
});
