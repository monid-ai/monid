import { assert, assertEquals, assertRejects } from "@std/assert";
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
const ID = "fuse#data/companies/resolve";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/companies/resolve: a domain resolves to the company, free", async () => {
    const result = await run("companies-resolve-found.json", {
        domain: "stripe.com",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        status: "found",
        company: {
            name: "Stripe",
            domain: "stripe.com",
            linkedinUrl: "linkedin.com/company/stripe",
            logoUrl:
                "https://img.imagecdn.dev/company-logo/at_82700c1a09d149ef87c707c065d73317.jpeg",
        },
    });
});

Deno.test("fuse#data/companies/resolve: nothing matching is a 200 not_found, never a guess", async () => {
    const result = await run("companies-resolve-not-found.json", {
        domain: "fuse-connector-fixture-0f3a9c.com",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, { status: "not_found", company: null });
});

Deno.test("fuse#data/companies/resolve: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited.json", {
        name: "Northwind Payments",
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("fuse#data/companies/resolve: the gate rejects no identifier, and passes a LinkedIn page alone", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}companies-resolve-found.json`,
    );
    const refused: Json[] = [{}, { website: "northwind-payments.example" }];
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
            body: { linkedinUrl: "linkedin.com/company/northwind-payments" },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "fuse#data/companies/resolve live: a well-known domain resolves",
    ignore: liveSkip("fuse"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { domain: "stripe.com" } },
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
