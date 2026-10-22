import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const chain = (name: string) => loadFixture(`${FIXTURES}${name}.json`);

const PERSON_URL = "https://www.linkedin.com/in/janedoe";
const COMPANY_URL = "https://www.linkedin.com/company/stripe";

/**
 * Reverse Contact's draw per synchronous endpoint, on its happy chain, as
 * the gateway prices it (public v2, 2026-10-21): 1 per fetched profile, 2
 * per enrichment, 1 per delivered search result, plus 1 base credit on the
 * prompt searches (3 credits for 2 rows, so a fold counting rows instead
 * of reading the receipt fails here), and 0 for the counts. Written as
 * LITERALS on purpose: deriving them from each doc's model would make this
 * table a tautology. A new endpoint must state its row here; the contact
 * finders have their own files.
 */
const RATE: Record<
    string,
    { fixture: string; input: RunInput; usage: Record<string, unknown> }
> = {
    "reversecontact#v2/fetch/persons": {
        fixture: "synthetic-fetch-person",
        input: { body: { url: PERSON_URL } },
        usage: { credits: { default: 1 }, evidence: { CREDIT: 1 } },
    },
    "reversecontact#v2/fetch/companies": {
        fixture: "synthetic-fetch-company",
        input: { body: { url: COMPANY_URL } },
        usage: { credits: { default: 1 }, evidence: { CREDIT: 1 } },
    },
    "reversecontact#v2/enrich/persons": {
        fixture: "synthetic-enrich-person",
        input: { body: { email: "jane.doe@example.com" } },
        usage: { credits: { default: 2 }, evidence: { CREDIT: 2 } },
    },
    "reversecontact#v2/enrich/companies": {
        fixture: "synthetic-enrich-company",
        input: { body: { domain: "example.com" } },
        usage: { credits: { default: 2 }, evidence: { CREDIT: 2 } },
    },
    "reversecontact#v2/search/people": {
        fixture: "synthetic-people-page",
        input: {
            body: { currentSeniority: ["VP"], currentFunction: ["Sales"] },
        },
        usage: { credits: { default: 2 }, evidence: { CREDIT: 2 } },
    },
    "reversecontact#v2/search/people/count": {
        fixture: "synthetic-count",
        input: { body: { currentSeniority: ["VP"] } },
        usage: { credits: {}, evidence: {} },
    },
    "reversecontact#v2/search/people/prompt": {
        fixture: "synthetic-people-prompt-page",
        input: { body: { prompt: "VPs of Sales in France" } },
        usage: { credits: { default: 3 }, evidence: { CREDIT: 3 } },
    },
    "reversecontact#v2/search/people/lookalike": {
        fixture: "synthetic-people-lookalike-page",
        input: { body: { url: PERSON_URL } },
        usage: { credits: { default: 2 }, evidence: { CREDIT: 2 } },
    },
    "reversecontact#v2/search/organizations": {
        fixture: "synthetic-organizations-page",
        input: { body: { industry: ["Software Development"] } },
        usage: { credits: { default: 2 }, evidence: { CREDIT: 2 } },
    },
    "reversecontact#v2/search/organizations/count": {
        fixture: "synthetic-count",
        input: { body: { industry: ["Software Development"] } },
        usage: { credits: {}, evidence: {} },
    },
    "reversecontact#v2/search/organizations/prompt": {
        fixture: "synthetic-organizations-prompt-page",
        input: { body: { prompt: "SaaS companies in France" } },
        usage: { credits: { default: 3 }, evidence: { CREDIT: 3 } },
    },
};

const CONTACT_IDS = [
    "reversecontact#v2/contact/email",
    "reversecontact#v2/contact/phone",
];

const providerIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("reversecontact#"))
        .sort();
};

const asRecord = (value: Json | undefined) =>
    value as Record<string, Json | undefined>;

Deno.test("reversecontact: the rate table and the contact finders cover exactly the compiled endpoints", async () => {
    const ids = await providerIds();
    assertEquals(ids.length, 13);
    assertEquals(ids, [...Object.keys(RATE), ...CONTACT_IDS].sort());
});

Deno.test("reversecontact: every synchronous happy run settles on its receipt, and the account's quotas leave the output", async () => {
    for (const [id, { fixture, input, usage }] of Object.entries(RATE)) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture: await chain(fixture),
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, usage, id);
        const output = asRecord(result.output);
        assertEquals("quotas" in output, false, id);
        assertEquals(output.success, true, id);
        assertEquals(typeof asRecord(output.metadata).requestId, "string", id);
    }
});

Deno.test("reversecontact: an empty search page is a real zero, never a fallback", async () => {
    for (
        const id of [
            "reversecontact#v2/search/people",
            "reversecontact#v2/search/organizations",
        ]
    ) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: RATE[id].input,
            mode: "replay",
            fixture: await chain("synthetic-search-empty"),
        });
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage.credits, {}, id);
        assertEquals(result.usage.evidence, { CREDIT: 0 }, id);
    }
});

Deno.test("reversecontact: a miss is a 404, data, zero usage, and the account's quotas leave the raw error", async () => {
    for (
        const id of [
            "reversecontact#v2/fetch/persons",
            "reversecontact#v2/enrich/persons",
            "reversecontact#v2/enrich/companies",
            "reversecontact#v2/search/people/lookalike",
        ]
    ) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: RATE[id].input,
            mode: "replay",
            fixture: await chain("synthetic-not-found"),
        });
        assertEquals(result.httpStatus, 404, id);
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
        const output = asRecord(result.output);
        assertEquals(output.code, "REQUEST_ERROR", id);
        assertEquals(output.message, "Not found", id);
        assertEquals("quotas" in asRecord(output.raw), false, id);
    }
});

Deno.test("reversecontact: error envelopes normalize to {message, code, details, raw}", async () => {
    const cases = [
        {
            fixture: "synthetic-validation-error",
            status: 422,
            code: "INVALID_FILTER_VALUE",
            details: { field: "currentCompanyIndustry" },
        },
        {
            fixture: "synthetic-insufficient-credits",
            status: 402,
            code: "INSUFFICIENT_CREDITS",
            details: { required: 25, available: 3 },
        },
        {
            fixture: "synthetic-blocked",
            status: 451,
            code: "DATA_SUBJECT_BLOCKED",
            details: { regulation: "GDPR/CCPA" },
        },
    ];
    const id = "reversecontact#v2/search/people";
    for (const { fixture, status, code, details } of cases) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: RATE[id].input,
            mode: "replay",
            fixture: await chain(fixture),
        });
        assertEquals(result.httpStatus, status, fixture);
        assertEquals(result.usage, { credits: {}, evidence: {} }, fixture);
        const output = asRecord(result.output);
        assertEquals(output.code, code, fixture);
        for (const [key, value] of Object.entries(details)) {
            assertEquals(asRecord(output.details)[key], value, fixture);
        }
        assertEquals("quotas" in asRecord(output.raw), false, fixture);
    }
});

Deno.test("reversecontact: estimates are the pre-run ceilings, with the vendor's page size of 25 when perPage is absent", async () => {
    const estimate = async (id: string, input: RunInput) =>
        (await estimateEndpoint(await testSealedUnit(id), input)).credits;
    assertEquals(
        await estimate(
            "reversecontact#v2/fetch/persons",
            RATE["reversecontact#v2/fetch/persons"].input,
        ),
        { default: 1 },
    );
    assertEquals(
        await estimate(
            "reversecontact#v2/enrich/persons",
            RATE["reversecontact#v2/enrich/persons"].input,
        ),
        { default: 2 },
    );
    assertEquals(
        await estimate("reversecontact#v2/search/people", {
            body: { currentSeniority: ["VP"] },
        }),
        { default: 25 },
    );
    assertEquals(
        await estimate("reversecontact#v2/search/people/prompt", {
            body: { prompt: "VPs of Sales in France", perPage: 10 },
        }),
        { default: 11 },
    );
    assertEquals(
        await estimate("reversecontact#v2/search/people/lookalike", {
            body: { id: "prs_01jexample0person00000000", perPage: 5 },
        }),
        { default: 5 },
    );
    assertEquals(
        await estimate("reversecontact#v2/search/organizations/count", {
            body: { industry: ["Software Development"] },
        }),
        {},
    );
    assertEquals(
        await estimate("reversecontact#v2/contact/email", {
            body: { url: PERSON_URL },
        }),
        { default: 3 },
    );
    assertEquals(
        await estimate("reversecontact#v2/contact/phone", {
            body: { url: PERSON_URL },
        }),
        { default: 20 },
    );
});

Deno.test("reversecontact: inputs the gateway would refuse, or that this connector withholds, are rejected before the wire", async () => {
    const rejected: Array<[string, Record<string, Json>]> = [
        // the gateway's URL patterns
        ["reversecontact#v2/fetch/persons", {
            url: "https://example.com/in/jane",
        }],
        ["reversecontact#v2/fetch/persons", { url: COMPANY_URL }],
        ["reversecontact#v2/fetch/companies", { url: PERSON_URL }],
        ["reversecontact#v2/fetch/persons", {}],
        // a person identifier is required; company fields alone are not one
        ["reversecontact#v2/enrich/persons", { companyDomain: "example.com" }],
        // exactly one lookalike seed
        ["reversecontact#v2/search/people/lookalike", {
            url: PERSON_URL,
            id: "prs_01jexample0person00000000",
        }],
        // closed taxonomies and vocabularies
        ["reversecontact#v2/search/people", { currentSeniority: ["Boss"] }],
        ["reversecontact#v2/search/people", { changedJobsWithinDays: 45 }],
        ["reversecontact#v2/search/people", { perPage: 101 }],
        // `page` is gone upstream; `cursor` replaced it
        ["reversecontact#v2/search/people", {
            currentSeniority: ["VP"],
            page: 2,
        }],
        // the prompt searches take no filters
        ["reversecontact#v2/search/people/prompt", {
            prompt: "VPs of Sales",
            currentSeniority: ["VP"],
        }],
        // counts take no pagination
        ["reversecontact#v2/search/organizations/count", {
            industry: ["Software Development"],
            perPage: 10,
        }],
        // withheld: attribution label and result push
        ["reversecontact#v2/search/organizations", {
            industry: ["Software Development"],
            issuer: "agent",
        }],
        ["reversecontact#v2/contact/email", {
            url: PERSON_URL,
            webhookUrl: "https://example.com/hook",
        }],
        // the finder's one-of rule
        ["reversecontact#v2/contact/email", { fullName: "Jane Doe" }],
        ["reversecontact#v2/contact/phone", {
            firstName: "Jane",
            companyDomain: "example.com",
        }],
    ];
    for (const [id, body] of rejected) {
        await assertRejects(
            async () =>
                runEndpoint({
                    unit: await testSealedUnit(id),
                    input: { body },
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
            `${id} ${JSON.stringify(body)}`,
        );
    }
});

Deno.test("reversecontact: fn provenance, one inject, one fromError, one receipt pair for the sync docs, one lifecycle for both finders", async () => {
    const bundle = await testBundle();
    const ids = await providerIds();
    const ref = bundle.endpoints["reversecontact#v2/fetch/persons"];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, ref.auth.inject.$fn.key, id);
        assertEquals(
            doc.output.fromError?.$fn.key,
            ref.output.fromError?.$fn.key,
            id,
        );
        assertEquals(
            doc.request.url.startsWith("https://api.reversecontact.com/v2/"),
            true,
            id,
        );
        assertEquals(doc.request.method, "POST", id);
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
    }
    const billedSync = Object.keys(RATE).filter((id) => !id.endsWith("/count"));
    for (const id of billedSync) {
        const usage = bundle.endpoints[id].usage;
        assertEquals(usage.evidence.$fn.key, ref.usage.evidence.$fn.key, id);
        assertEquals(
            usage.consolidate?.$fn.key,
            ref.usage.consolidate?.$fn.key,
            id,
        );
    }
    const [email, phone] = CONTACT_IDS.map((id) => bundle.endpoints[id]);
    assertEquals(
        email.lifecycle?.start.$fn.key,
        phone.lifecycle?.start.$fn.key,
    );
    assertEquals(
        email.lifecycle?.poll?.$fn.key,
        phone.lifecycle?.poll?.$fn.key,
    );
    assertEquals(email.usage.evidence.$fn.key, phone.usage.evidence.$fn.key);
    assertEquals(
        email.usage.consolidate?.$fn.key,
        phone.usage.consolidate?.$fn.key,
    );
    // the finders settle on the job's receipt, not on the poll's quotas
    assertEquals(
        email.usage.evidence.$fn.key === ref.usage.evidence.$fn.key,
        false,
    );
    assertEquals(
        ids.filter((id) => bundle.endpoints[id].lifecycle !== undefined),
        CONTACT_IDS,
    );
});

Deno.test({
    name:
        "reversecontact live (gated on REVERSECONTACT_API_KEY): the free counts settle at zero",
    ignore: liveSkip("reversecontact"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("reversecontact#v2/search/people/count"),
            input: {
                body: { currentSeniority: ["VP"], currentFunction: ["Sales"] },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const count = asRecord(asRecord(result.output).data).count;
        assertEquals(typeof count, "number");
    },
});
