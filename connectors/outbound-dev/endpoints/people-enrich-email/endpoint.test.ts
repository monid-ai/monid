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
const ID = "outbound-dev#people/enrich/email";
const ANA = { linkedinUrl: "https://www.linkedin.com/in/ana-ruiz-ops" };
const EMAIL = "ana.ruiz@halden-freight.example";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#people/enrich/email: an email the package finds settles $0.02", async () => {
    const result = await run("synthetic-enrich-email-found.json", ANA);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.02 },
        evidence: { email_found_package: 1, email_found_waterfall: 0 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.primaryEmail, EMAIL);
    assertEquals(output.emails, [{ email: EMAIL, status: "valid" }]);
    assertEquals(output.found, {
        email: { email: EMAIL, foundBy: "package" },
    });
    // The workspace's own id for the contact never describes the caller.
    assertEquals("personId" in output, false);
});

Deno.test("outbound-dev#people/enrich/email: an email a further provider finds settles $0.05", async () => {
    const result = await run("synthetic-enrich-email-found-waterfall.json", {
        ...ANA,
        providers: "waterfall",
    });
    assertEquals(result.usage, {
        credits: { default: 0.05 },
        evidence: { email_found_package: 0, email_found_waterfall: 1 },
    });
});

Deno.test("outbound-dev#people/enrich/email: a miss answers 200 and settles ZERO", async () => {
    const result = await run("synthetic-enrich-nothing-found.json", ANA);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { email_found_package: 0, email_found_waterfall: 0 },
    });
    assertEquals((result.output as Record<string, unknown>).emails, []);
});

Deno.test("outbound-dev#people/enrich/email: an address listed in `emails` is billed only when `found` holds it", async () => {
    // outbound.dev states the charge in `found`, never in `emails`.
    const result = await run("synthetic-enrich-listed-not-charged.json", ANA);
    assertEquals(result.usage, {
        credits: {},
        evidence: { email_found_package: 0, email_found_waterfall: 0 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.primaryEmail, EMAIL);
    assertEquals(output.found, {});
});

Deno.test("outbound-dev#people/enrich/email: a person who cannot be identified is zero-billed data", async () => {
    const result = await run("synthetic-person-not-identifiable.json", {
        fullName: "Ana Ruiz",
        companyName: "Halden",
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).code,
        "person_not_identifiable",
    );
});

Deno.test("outbound-dev#people/enrich/email estimate: one email, at the package's price or the waterfall's", async () => {
    const unit = await testSealedUnit(ID);
    const byDefault = await estimateEndpoint(unit, { body: ANA });
    assertEquals(byDefault.credits, { default: 0.02 });
    const waterfall = await estimateEndpoint(unit, {
        body: { ...ANA, providers: "waterfall" },
    });
    assertEquals(waterfall.credits, { default: 0.05 });
});

Deno.test("outbound-dev#people/enrich/email: the gate names a person one way", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-enrich-nothing-found.json`,
    );
    const refused: Json[] = [
        {},
        { fullName: "Ana Ruiz" },
        { companyDomain: "halden-freight.example" },
        { ...ANA, fullName: "Ana Ruiz" },
        {
            fullName: "Ana Ruiz",
            firstName: "Ana",
            companyDomain: "halden-freight.example",
        },
        { linkedinUrl: "https://www.linkedin.com/company/halden-freight" },
        { personId: "6a1f0c2b9d4e8a7f3c5b2e22" },
        { ...ANA, find: "phone" },
        { ...ANA, providers: "everything" },
    ];
    for (const body of refused) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    const accepted: Json[] = [
        ANA,
        { fullName: "Ana Ruiz", companyDomain: "halden-freight.example" },
        { firstName: "Ana", lastName: "Ruiz", companyName: "Halden Freight" },
        { lastName: "Ruiz", companyDomain: "halden-freight.example" },
        { ...ANA, providers: "waterfall" },
    ];
    for (const body of accepted) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test({
    name:
        "outbound-dev#people/enrich/email live: a lookup answers with its emails",
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
        assert(Array.isArray(output.emails));
        assertEquals("personId" in output, false);
    },
});
