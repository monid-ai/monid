import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "fuse#data/companies/people";
const NORTHWIND_VPS = {
    company: { domain: "northwind-payments.example" },
    filters: { job_title_levels: [{ status: "include", value: "vp" }] },
};

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/companies/people: a page settles its receipt and hands back the next token", async () => {
    const result = await run("synthetic-companies-people.json", {
        ...NORTHWIND_VPS,
        size: 2,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { CREDIT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "found");
    assertEquals(
        (output.company as Record<string, unknown>).domain,
        "northwind-payments.example",
    );
    const people = output.people as Record<string, unknown>[];
    assertEquals(people.map((person) => person.linkedin_url), [
        "linkedin.com/in/ada-fielding",
        "linkedin.com/in/lena-park-northwind",
    ]);
    assertEquals(output.scrollToken, "st_synthetic_page_2");
    assertEquals("creditsCharged" in output, false);
});

Deno.test("fuse#data/companies/people: a company nothing matches answers 200 not_found and settles ZERO", async () => {
    const result = await run("synthetic-companies-people-not-found.json", {
        company: { name: "Northwind Paymnts" },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "not_found");
    assertEquals(output.people, []);
    assertEquals(output.scrollToken, null);
});

Deno.test("fuse#data/companies/people: an unresolved filter value is zero-billed data naming the filter", async () => {
    const result = await run("synthetic-companies-people-unresolved.json", {
        company: { domain: "northwind-payments.example" },
        filters: { location_region: ["Atlantis"] },
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "FILTER_VALUE_UNRESOLVED");
    assertEquals(output.param, "filters.location_region");
});

Deno.test("fuse#data/companies/people estimate: a full page at the plan's company_people price, 10 unless asked", async () => {
    const unit = await testSealedUnit(ID);
    const byDefault = await estimateEndpoint(unit, { body: NORTHWIND_VPS });
    assertEquals(byDefault.credits, { default: 10 });
    const asked = await estimateEndpoint(unit, {
        body: { ...NORTHWIND_VPS, size: 25 },
    });
    assertEquals(asked.credits, { default: 25 });
});

Deno.test("fuse#data/companies/people: the gate rejects the company filters, no company and an oversized page, and passes a token", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-companies-people.json`,
    );
    const refused: Json[] = [
        { filters: NORTHWIND_VPS.filters },
        { ...NORTHWIND_VPS, size: 26 },
        {
            ...NORTHWIND_VPS,
            filters: { job_company_name: ["Northwind Payments"] },
        },
        {
            ...NORTHWIND_VPS,
            filters: { "experience.company.name": ["Ledgerline"] },
        },
    ];
    for (const body of refused) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: {
            body: { ...NORTHWIND_VPS, scrollToken: "st_synthetic_page_2" },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "fuse#data/companies/people live: a list answers found or not_found",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    company: { domain: "northwind-payments.example" },
                    size: 1,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assert(output.status === "found" || output.status === "not_found");
        assert(Array.isArray(output.people));
        assertEquals("creditsCharged" in output, false);
    },
});
