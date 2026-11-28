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
const ID = "outbound-dev#people/enrich/phone";
const ANA = { linkedinUrl: "https://www.linkedin.com/in/ana-ruiz-ops" };
const PHONE = "+14155550123";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#people/enrich/phone: a number the package finds settles $0.05", async () => {
    const result = await run("synthetic-enrich-phone-found.json", ANA);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.05 },
        evidence: { phone_found_package: 1, phone_found_waterfall: 0 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.primaryPhone, PHONE);
    assertEquals(output.phones, [{ phoneNumber: PHONE, status: "valid" }]);
    assertEquals("personId" in output, false);
});

Deno.test("outbound-dev#people/enrich/phone: a number a further provider finds settles $0.10", async () => {
    const result = await run("synthetic-enrich-phone-found-waterfall.json", {
        ...ANA,
        providers: "waterfall",
    });
    assertEquals(result.usage, {
        credits: { default: 0.1 },
        evidence: { phone_found_package: 0, phone_found_waterfall: 1 },
    });
});

Deno.test("outbound-dev#people/enrich/phone: a miss answers 200 and settles ZERO", async () => {
    const result = await run("synthetic-enrich-nothing-found.json", ANA);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: {},
        evidence: { phone_found_package: 0, phone_found_waterfall: 0 },
    });
});

Deno.test("outbound-dev#people/enrich/phone: an email found on the same answer is never billed here", async () => {
    // The email fixture's `found` holds an email only: this endpoint counts
    // `found.phone`, so nothing is billed.
    const result = await run("synthetic-enrich-email-found.json", ANA);
    assertEquals(result.usage, {
        credits: {},
        evidence: { phone_found_package: 0, phone_found_waterfall: 0 },
    });
});

Deno.test("outbound-dev#people/enrich/phone: a balance that cannot cover the lookup is zero-billed data", async () => {
    const result = await run("synthetic-insufficient-balance.json", ANA);
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("outbound-dev#people/enrich/phone estimate: one number, at the package's price or the waterfall's", async () => {
    const unit = await testSealedUnit(ID);
    const byDefault = await estimateEndpoint(unit, { body: ANA });
    assertEquals(byDefault.credits, { default: 0.05 });
    const waterfall = await estimateEndpoint(unit, {
        body: { ...ANA, providers: "waterfall" },
    });
    assertEquals(waterfall.credits, { default: 0.1 });
});

Deno.test("outbound-dev#people/enrich/phone: the gate refuses a caller's own `find`, and passes a name with a company", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-enrich-nothing-found.json`,
    );
    const refused: Json[] = [
        { ...ANA, find: "email" },
        { firstName: "Ana" },
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
            body: { firstName: "Ana", companyName: "Halden Freight" },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "outbound-dev#people/enrich/phone live: a lookup answers with its phones",
    ignore: liveSkip("outbound-dev"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    fullName: "Ana Ruiz",
                    companyDomain: "halden-freight.example",
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
        assert(Array.isArray(output.phones));
    },
});
