import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./", import.meta.url));
const COMPANY_ID = "11111111-2222-4333-8444-555555555551";

/**
 * Dealport's published V4 plain-USD rate card
 * (https://app.dealport.com/openapi/v1.json, checked 2026-11-27), pinned as
 * literals so a typo in any endpoint's model or vendor receipt consolidation
 * fails loudly.
 */
const RATE: Record<
    string,
    {
        folder: string;
        status: number;
        input: RunInput;
        usage: Record<string, unknown>;
    }
> = {
    "dealport#api/v1/companies/preview": {
        folder: "preview-companies",
        status: 200,
        input: {
            body: { state: "OH", naics: ["238220"], independent: true },
        },
        usage: { credits: {}, evidence: {} },
    },
    "dealport#api/v1/companies/match": {
        folder: "match-company-list",
        status: 200,
        input: {
            body: {
                items: [{
                    external_id: "crm-101",
                    name: "Buckeye Climate Systems LLC",
                    domain: "buckeyeclimate-example.com",
                    state: "OH",
                }],
            },
        },
        usage: { credits: {}, evidence: {} },
    },
    "dealport#api/v1/companies": {
        folder: "search-companies",
        status: 200,
        input: {
            queryParams: { state: "OH", naics: "238220", limit: 2 },
        },
        usage: { credits: { default: 0.02 }, evidence: { RESULT: 2 } },
    },
    "dealport#api/v1/buildings": {
        folder: "search-buildings",
        status: 200,
        input: {
            queryParams: { borough: "MN", min_units: 20, limit: 2 },
        },
        usage: { credits: { default: 0.02 }, evidence: { RESULT: 2 } },
    },
    "dealport#api/v1/records/{id}": {
        folder: "get-record",
        status: 200,
        input: { pathParams: { id: COMPANY_ID } },
        usage: { credits: { default: 0.01 }, evidence: { RESULT: 1 } },
    },
    "dealport#api/v1/pages": {
        folder: "fetch-company-pages",
        status: 200,
        input: {
            body: {
                domains: [
                    "buckeyeclimate-example.com",
                    "cuyahogamechanical-example.com",
                ],
            },
        },
        usage: { credits: { default: 0.01 }, evidence: { RESULT: 1 } },
    },
    "dealport#api/v1/owners": {
        folder: "find-owner",
        status: 200,
        input: { body: { company_id: COMPANY_ID } },
        usage: { credits: { default: 0.09 }, evidence: { RESULT: 1 } },
    },
    "dealport#api/v1/contacts": {
        folder: "find-contact",
        status: 200,
        input: { body: { company_id: COMPANY_ID, person: "Jordan Blake" } },
        usage: { credits: { default: 0.09 }, evidence: { RESULT: 1 } },
    },
    "dealport#api/v1/buildings/owners": {
        folder: "research-building-owners",
        status: 202,
        input: {
            body: {
                bbls: ["1008350041", "1008400012"],
                confirm_max_usd: 0.1,
            },
        },
        usage: { credits: { default: 0.1 }, evidence: { RESULT: 2 } },
    },
};

const dealportIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("dealport#"))
        .sort();
};

Deno.test("dealport: the literal rate table covers exactly the 9 compiled endpoints", async () => {
    const ids = await dealportIds();
    assertEquals(ids.length, 9);
    assertEquals(ids, Object.keys(RATE).sort());
});

Deno.test("dealport: every endpoint settles its published USD rate and strips billing receipts", async () => {
    for (const [id, { folder, status, input, usage }] of Object.entries(RATE)) {
        const unit = await testSealedUnit(id);
        const fixture = await loadFixture(
            `${HERE}endpoints/${folder}/fixtures/synthetic-happy.json`,
        );
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, status, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, usage, id);

        const output = result.output as Record<string, Json>;
        assertEquals("cost_usd" in output, false, id);
        assertEquals("credits_charged" in output, false, id);
        assertEquals("remaining_balance_usd" in output, false, id);
        if (
            output.data !== undefined && output.data !== null &&
            typeof output.data === "object" && !Array.isArray(output.data)
        ) {
            const nested = output.data as Record<string, Json>;
            assertEquals("cost_usd" in nested, false, `${id} nested cost_usd`);
            assertEquals(
                "credits_charged" in nested,
                false,
                `${id} nested credits_charged`,
            );
            assertEquals(
                "remaining_balance_usd" in nested,
                false,
                `${id} nested remaining_balance_usd`,
            );
        }
    }
});

Deno.test("dealport: vendor receipt wins on repricing and surfaces derived fold in mismatch", async () => {
    const id = "dealport#api/v1/owners";
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${HERE}endpoints/find-owner/fixtures/synthetic-happy.json`,
    );
    (fixture.calls[0].res.body as Record<string, Json>).cost_usd = 0.12;
    const result = await runEndpoint({
        unit,
        input: RATE[id].input,
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 0.12 },
        evidence: { RESULT: 1 },
        mismatch: { derived: { default: 0.09 } },
    });
});

Deno.test("dealport: nested zero-charge receipt settles at $0.00 and is stripped", async () => {
    const id = "dealport#api/v1/buildings/owners";
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${HERE}endpoints/research-building-owners/fixtures/synthetic-happy.json`,
    );
    const body = fixture.calls[0].res.body as Record<string, Json>;
    delete body.cost_usd;
    (body.data as Record<string, Json>).cost_usd = 0;
    const result = await runEndpoint({
        unit,
        input: RATE[id].input,
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
    assertEquals(
        "cost_usd" in
            ((result.output as Record<string, Json>).data as Record<
                string,
                Json
            >),
        false,
    );
});

Deno.test("dealport: an unmetered response falls back to the structural rate-card fold", async () => {
    const id = "dealport#api/v1/records/{id}";
    const unit = await testSealedUnit(id);
    const fixture = await loadFixture(
        `${HERE}endpoints/get-record/fixtures/synthetic-happy.json`,
    );
    const body = fixture.calls[0].res.body as Record<string, Json>;
    delete body.cost_usd;
    delete body.credits_charged;
    const result = await runEndpoint({
        unit,
        input: RATE[id].input,
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { RESULT: 1 },
    });
});

Deno.test("dealport: usage fn provenance: shared auth and consolidate, interned search and owner fns", async () => {
    const bundle = await testBundle();
    const ids = await dealportIds();
    const first = bundle.endpoints[ids[0]];

    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assert(
            doc.request.url.startsWith("https://app.dealport.com/api/v1/"),
            `${id}: unexpected url ${doc.request.url}`,
        );
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            first.usage.consolidate?.$fn.key,
            id,
        );
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
    }

    for (
        const freeId of [
            "dealport#api/v1/companies/preview",
            "dealport#api/v1/companies/match",
        ]
    ) {
        const doc = bundle.endpoints[freeId];
        assertEquals(
            bundle.fnTable[doc.usage.estimate.$fn.key].provenance,
            "core#usage.synthesizedEmpty",
            freeId,
        );
        assertEquals(
            bundle.fnTable[doc.usage.evidence.$fn.key].provenance,
            "core#usage.synthesizedEmpty",
            freeId,
        );
    }

    assertEquals(
        bundle.endpoints["dealport#api/v1/companies"].usage.estimate.$fn.key,
        bundle.endpoints["dealport#api/v1/buildings"].usage.estimate.$fn.key,
    );
    assertEquals(
        bundle.endpoints["dealport#api/v1/companies"].usage.evidence.$fn.key,
        bundle.endpoints["dealport#api/v1/buildings"].usage.evidence.$fn.key,
    );

    assertEquals(
        bundle.endpoints["dealport#api/v1/owners"].usage.estimate.$fn.key,
        bundle.endpoints["dealport#api/v1/contacts"].usage.estimate.$fn.key,
    );
    assertEquals(
        bundle.endpoints["dealport#api/v1/owners"].usage.estimate.$fn.key,
        bundle.endpoints["dealport#api/v1/records/{id}"].usage.estimate.$fn.key,
    );
    assertEquals(
        bundle.endpoints["dealport#api/v1/owners"].usage.evidence.$fn.key,
        bundle.endpoints["dealport#api/v1/contacts"].usage.evidence.$fn.key,
    );
});
