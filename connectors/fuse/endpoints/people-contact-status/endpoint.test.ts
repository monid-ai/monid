import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "fuse#data/people/contact-status";
const ADA = { linkedinUrl: "https://www.linkedin.com/in/ada-fielding" };

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/people/contact-status: what Fuse holds, without a value, free", async () => {
    const result = await run("synthetic-person-contact-status.json", ADA);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        email: { isKnown: true, type: "work", status: "valid" },
        phone: { isKnown: false },
    });
});

Deno.test("fuse#data/people/contact-status: a person Fuse cannot identify is zero-billed data", async () => {
    const result = await run("synthetic-person-not-identifiable.json", {
        name: "Ada Fielding",
        companyDomain: "not a domain",
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "PERSON_NOT_IDENTIFIABLE",
    );
});

Deno.test("fuse#data/people/contact-status: the gate rejects a name alone and a company name, and passes a name with a domain", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-person-contact-status.json`,
    );
    const refused: Json[] = [
        {},
        { name: "Ada Fielding" },
        { name: "Ada Fielding", companyName: "Northwind Payments" },
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
    name:
        "fuse#data/people/contact-status live: a check answers both kinds, free",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: ADA },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, Record<string, unknown>>;
        assertEquals(typeof output.email.isKnown, "boolean");
        assertEquals(typeof output.phone.isKnown, "boolean");
        assertEquals("creditsCharged" in output, false);
    },
});
