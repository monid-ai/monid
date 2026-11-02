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
const ID = "fuse#data/people/reverse-phone";
/** 555-0100 to 555-0199 are reserved for fiction: a valid number nobody has. */
const NUMBER = { phone: "+1 202 555 0143" };

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/people/reverse-phone: a person found settles the 2 on its receipt", async () => {
    const result = await run(
        "synthetic-person-reverse-phone-found.json",
        NUMBER,
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { CREDIT: 2 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "found");
    assertEquals(
        (output.person as Record<string, unknown>).linkedin_url,
        "linkedin.com/in/ada-fielding",
    );
    assertEquals("creditsCharged" in output, false);
});

Deno.test("fuse#data/people/reverse-phone: nobody found answers 200 and settles ZERO", async () => {
    const result = await run("synthetic-person-reverse-not-found.json", NUMBER);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    assertEquals((result.output as Record<string, unknown>).person, null);
});

Deno.test("fuse#data/people/reverse-phone: a number that reads as none is zero-billed data", async () => {
    const result = await run("synthetic-person-reverse-phone-invalid.json", {
        phone: "12",
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "PHONE_NUMBER_INVALID",
    );
});

Deno.test("fuse#data/people/reverse-phone estimate: one person found, at the plan's people_reverse_phone price", async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: NUMBER,
    });
    assertEquals(usage.credits, { default: 2 });
});

Deno.test("fuse#data/people/reverse-phone: the gate rejects no number, an empty one and an overlong one, and passes a typed one", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-person-reverse-not-found.json`,
    );
    const refused: Json[] = [{}, { phone: "" }, { phone: "1".repeat(41) }];
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
        input: { body: { phone: "(202) 555-0143" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "fuse#data/people/reverse-phone live: a lookup answers found or not_found",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: NUMBER },
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
