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
const ID = "fuse#data/people/reverse-email";
const ADDRESS = { email: "ada@northwind-payments.example" };

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/people/reverse-email: a person found settles the 1 on its receipt", async () => {
    const result = await run(
        "synthetic-person-reverse-email-found.json",
        ADDRESS,
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "found");
    const person = output.person as Record<string, unknown>;
    assertEquals(person.linkedin_url, "linkedin.com/in/ada-fielding");
    assertEquals(person.job_company_website, "northwind-payments.example");
    assertEquals("creditsCharged" in output, false);
});

Deno.test("fuse#data/people/reverse-email: nobody found answers 200 and settles ZERO", async () => {
    const result = await run(
        "synthetic-person-reverse-not-found.json",
        ADDRESS,
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    assertEquals((result.output as Record<string, unknown>).person, null);
});

Deno.test("fuse#data/people/reverse-email: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited.json", ADDRESS);
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("fuse#data/people/reverse-email estimate: one person found, at the plan's people_reverse_email price", async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: ADDRESS,
    });
    assertEquals(usage.credits, { default: 1 });
});

Deno.test("fuse#data/people/reverse-email: the gate rejects no address and a stray field, and passes an address", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-person-reverse-not-found.json`,
    );
    const refused: Json[] = [{}, { ...ADDRESS, name: "Ada Fielding" }];
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
        input: { body: ADDRESS },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "fuse#data/people/reverse-email live: a lookup answers found or not_found",
    ignore: liveSkip("fuse"),
    fn: async () => {
        // Fuse refuses an address under a top-level domain that does not
        // exist (`.example` answers 422 VALIDATION_FAILED), so the live lookup
        // sends RFC 2606's documentation domain, which sits under `.com`.
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { email: "nobody@example.com" } },
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
