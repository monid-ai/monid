import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import type { RecordedCall } from "@shared/testing";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * Data Legion's six products through the compiled docs. The synthetic
 * match fixtures carry every field group (Base, Premium top-level and
 * nested, PII), so each test sees exactly what its product's filter keeps.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);
const PERSON = { body: { email: "jane@acme.com" } };
const COMPANY = { body: { domain: "acme.com" } };

async function match(
    id: string,
    name: string,
    input: { body: Record<string, Json> } = PERSON,
) {
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        fixture: await fixture(name),
    });
    assertEquals(result.httpStatus, 200);
    const output = result.output as { matches: Record<string, Json>[] };
    return { result, record: output.matches[0] };
}

const PII = ["sex", "age", "work_email", "mobile_phone", "phones", "emails"];
const PREMIUM = ["seniority_level", "linkedin_followers", "certifications"];
const nested = (record: Record<string, Json>, ...path: string[]) =>
    path.reduce<Json | undefined>(
        (node, key) =>
            node !== null && typeof node === "object" && !Array.isArray(node)
                ? (node as Record<string, Json>)[key]
                : undefined,
        record,
    );

Deno.test("datalegion person base/no-pii: Base profile only, 1 person credit", async () => {
    const { result, record } = await match(
        "datalegion#person/enrich/base/no-pii",
        "synthetic-person-match",
    );
    assertEquals(result.usage, {
        credits: { person: 1 },
        evidence: { RESULT: 1 },
    });
    for (const field of [...PII, ...PREMIUM]) {
        assertEquals(field in record, false, field);
    }
    assertEquals(record.full_name, "jane doe");
    // nested Premium subfields go too
    assertEquals(nested(record, "headline", "raw"), undefined);
    assertEquals(
        nested(record, "headline", "cleaned"),
        "VP Engineering at Acme",
    );
    const experience = (record.experience as Record<string, Json>[])[0];
    assertEquals("seniority_level" in experience, false);
    assertEquals(nested(experience, "title", "raw"), undefined);
    assertEquals(nested(experience, "title", "cleaned"), "vp of engineering");
});

Deno.test("datalegion person base/pii: Base plus contact data, no Premium", async () => {
    const { record } = await match(
        "datalegion#person/enrich/base/pii",
        "synthetic-person-match",
    );
    for (const field of PII) assertEquals(field in record, true, field);
    for (const field of PREMIUM) assertEquals(field in record, false, field);
    const email = (record.emails as Record<string, Json>[])[0];
    assertEquals(email.address, "jane@acme.com");
    // Premium email metadata is stripped inside the kept PII array
    for (const field of ["confidence", "validated", "hash_sha256"]) {
        assertEquals(field in email, false, field);
    }
});

Deno.test("datalegion person premium/no-pii: Premium attributes, no contact data", async () => {
    const { record } = await match(
        "datalegion#person/enrich/premium/no-pii",
        "synthetic-person-match",
    );
    for (const field of PII) assertEquals(field in record, false, field);
    for (const field of PREMIUM) assertEquals(field in record, true, field);
    assertEquals(nested(record, "headline", "raw"), "VP Engineering @ Acme!!");
});

Deno.test("datalegion person premium/pii: every field, no request filter", async () => {
    const { record } = await match(
        "datalegion#person/enrich/premium/pii",
        "synthetic-person-match",
    );
    for (const field of [...PII, ...PREMIUM]) {
        assertEquals(field in record, true, field);
    }
});

Deno.test("datalegion person: no match is a free 404", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("datalegion#person/enrich/base/no-pii"),
        input: PERSON,
        mode: "replay",
        fixture: await fixture("synthetic-person-no-match"),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("datalegion company base: firmographics only, 1 company credit", async () => {
    const { result, record } = await match(
        "datalegion#company/enrich/base",
        "synthetic-company-match",
        COMPANY,
    );
    assertEquals(result.usage, {
        credits: { company: 1 },
        evidence: { RESULT: 1 },
    });
    for (
        const field of [
            "linkedin_followers",
            "legion_employee_count",
            "legion_employee_growth_rate",
            "num_sources",
        ]
    ) {
        assertEquals(field in record, false, field);
    }
    assertEquals(nested(record, "name", "cleaned"), "acme");
    assertEquals(nested(record, "name", "display"), undefined);
    const location = (record.locations as Record<string, Json>[])[0];
    assertEquals("geo" in location, false);
    assertEquals(location.city, "austin");
});

Deno.test("datalegion company premium: workforce analytics kept", async () => {
    const { record } = await match(
        "datalegion#company/enrich/premium",
        "synthetic-company-match",
        COMPANY,
    );
    assertEquals(record.legion_employee_count, 340);
    assertEquals(nested(record, "name", "display"), "Acme");
});

Deno.test("datalegion: the product's top-level exclusions merge into the caller's exclude_fields", async () => {
    // record mode over a stubbed fetch captures the request we send
    const realFetch = globalThis.fetch;
    const previousKey = Deno.env.get("DATALEGION_API_KEY");
    Deno.env.set("DATALEGION_API_KEY", "test-key");
    globalThis.fetch = () =>
        Promise.resolve(
            new Response(JSON.stringify({ matches: [], total: 0 }), {
                status: 200,
                headers: { "content-type": "application/json" },
            }),
        );
    const sink: RecordedCall[] = [];
    try {
        await runEndpoint({
            unit: await testSealedUnit(
                "datalegion#person/enrich/premium/no-pii",
            ),
            input: {
                body: {
                    email: "jane@acme.com",
                    exclude_fields: "education,sex",
                },
            },
            mode: "record",
            sink,
        });
    } finally {
        globalThis.fetch = realFetch;
        if (previousKey === undefined) Deno.env.delete("DATALEGION_API_KEY");
        else Deno.env.set("DATALEGION_API_KEY", previousKey);
    }
    const sent = sink[0].req.body as Record<string, Json>;
    const excluded = String(sent.exclude_fields).split(",");
    // the caller's own entries first, then the product's, no duplicates
    assertEquals(excluded.slice(0, 2), ["education", "sex"]);
    assert(excluded.includes("emails") && excluded.includes("phones"));
    assertEquals(excluded.filter((field) => field === "sex").length, 1);
    assertEquals(excluded.includes("seniority_level"), false);
});

Deno.test({
    name: "datalegion person live (gated on DATALEGION_API_KEY)",
    ignore: liveSkip("datalegion"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("datalegion#person/enrich/base/no-pii"),
            input: PERSON,
            mode: "live",
        });
        assert(
            result.httpStatus === 200 || result.httpStatus === 404,
            JSON.stringify(result.output),
        );
    },
});
