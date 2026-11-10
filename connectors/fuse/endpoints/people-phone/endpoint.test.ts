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
const ID = "fuse#data/people/phone";
const ADA = { linkedinUrl: "https://www.linkedin.com/in/ada-fielding" };

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/people/phone: a found phone settles the 10 on its receipt", async () => {
    const result = await run("synthetic-person-phone-found.json", ADA);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 10 },
        evidence: { CREDIT: 10 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.phone, { value: "+12025550143" });
    assertEquals("creditsCharged" in output, false);
});

Deno.test("fuse#data/people/phone: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited.json", ADA);
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "RATE_LIMITED",
    );
});

Deno.test("fuse#data/people/phone estimate: one phone found, at the plan's people_phone price", async () => {
    // The usage plan of the key Fuse issues to the platform, 2026-10-29.
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: ADA,
    });
    assertEquals(usage.credits, { default: 10 });
});

Deno.test("fuse#data/people/phone: the gate rejects an unknown key, and passes a name with a company", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-person-phone-found.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { ...ADA, phoneType: "mobile" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: {
            body: { name: "Ada Fielding", companyName: "Northwind Payments" },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "fuse#data/people/phone live: a lookup answers found or not_found",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    name: "Ada Fielding",
                    companyDomain: "northwind-payments.example",
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
    },
});
