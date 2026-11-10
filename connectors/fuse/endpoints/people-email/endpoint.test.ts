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
const ID = "fuse#data/people/email";
const ADA = { linkedinUrl: "https://www.linkedin.com/in/ada-fielding" };

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/people/email: a found email settles the 5 on its receipt", async () => {
    const result = await run("synthetic-person-email-found.json", ADA);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CREDIT: 5 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "found");
    assertEquals(output.email, {
        value: "ada@northwind-payments.example",
        status: "valid",
        type: "work",
    });
    assertEquals("creditsCharged" in output, false);
});

Deno.test("fuse#data/people/email: a miss answers 200 and settles ZERO", async () => {
    const result = await run("person-email-not-found.json", ADA);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    assertEquals((result.output as Record<string, unknown>).email, null);
});

Deno.test("fuse#data/people/email: a person Fuse cannot identify is zero-billed data", async () => {
    const result = await run("synthetic-person-not-identifiable.json", {
        name: "Ada Fielding",
        companyName: "Northwind Payments",
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "PERSON_NOT_IDENTIFIABLE",
    );
});

Deno.test("fuse#data/people/email estimate: one email found, at the plan's people_email price", async () => {
    // The usage plan of the key Fuse issues to the platform, 2026-10-29.
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: ADA,
    });
    assertEquals(usage.credits, { default: 5 });
});

Deno.test("fuse#data/people/email: the gate rejects a name alone, and passes a name with a domain", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}person-email-not-found.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { name: "Ada Fielding" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: {
            body: {
                name: "Ada Fielding",
                companyDomain: "northwind-payments.example",
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "fuse#data/people/email live: a lookup answers found or not_found",
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
        assertEquals("creditsCharged" in output, false);
    },
});
