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
const ID = "outbound-dev#companies/people";
const HALDEN = { domain: "halden-freight.example" };

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#companies/people: two people at the company bill two rows at $0.001", async () => {
    const result = await run("synthetic-companies-people.json", {
        company: HALDEN,
        filters: { job_title_levels: ["director", "vp"] },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.002 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "found");
    assertEquals(
        (output.company as Record<string, unknown>).domain,
        "halden-freight.example",
    );
    assertEquals((output.data as unknown[]).length, 2);
});

Deno.test("outbound-dev#companies/people: a company nothing matches answers 200 and settles ZERO", async () => {
    const result = await run("synthetic-companies-people-not-found.json", {
        company: { name: "No Such Company Anywhere" },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "not_found");
    assertEquals(output.company, null);
});

Deno.test("outbound-dev#companies/people: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-validation-failed.json", {
        company: HALDEN,
        filters: { job_title_levels: ["chief"] },
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("outbound-dev#companies/people estimate: the page size, 10 by default and 25 at most", async () => {
    const unit = await testSealedUnit(ID);
    const byDefault = await estimateEndpoint(unit, {
        body: { company: HALDEN },
    });
    assertEquals(byDefault.credits, { default: 0.01 });
    const full = await estimateEndpoint(unit, {
        body: { company: HALDEN, limit: 25 },
    });
    assertEquals(full.credits, { default: 0.025 });
});

Deno.test("outbound-dev#companies/people: the gate rejects a missing or empty company and limit 26, and passes a name", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-companies-people.json`,
    );
    const refused: Json[] = [
        { filters: { job_title_levels: ["vp"] } },
        { company: {} },
        { company: { website: "halden-freight.example" } },
        { company: HALDEN, limit: 26 },
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
        input: { body: { company: { name: "Halden Freight" }, limit: 25 } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "outbound-dev#companies/people live: a company answers found or not_found",
    ignore: liveSkip("outbound-dev"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    company: { domain: "outbound.dev" },
                    limit: 1,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        const output = result.output as Record<string, unknown>;
        assert(output.status === "found" || output.status === "not_found");
        assert((output.data as unknown[]).length <= 1);
    },
});
