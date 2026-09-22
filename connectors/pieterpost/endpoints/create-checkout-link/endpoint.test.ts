import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "pieterpost#create-checkout-link";
const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        idempotencyKey: "checkout-synthetic-001",
        requestType: "letter" as const,
        letters: [{
            message: "Thanks for your order.",
            recipient: {
                name: "Pieter Example",
                streetAddress: "Damrak 1",
                postalCode: "1012 LG",
                city: "Amsterdam",
                country: "NL",
            },
        }],
        locale: "en" as const,
        paymentMethod: "auto" as const,
        returnUrl: "https://example.com/pieterpost-return",
        senderEmail: "sender@example.com",
    },
};

Deno.test(`${ID} happy: returns an unpaid checkout and stays free`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 201);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "checkout_open");
    assertEquals(output.paidAt, null);
    assertEquals(output.fulfilledAt, null);
});

Deno.test(`${ID} provider error: address warning is zero-billed`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${FIXTURES}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 409);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} rejects mixed letter/postcard input before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    body: {
                        ...INPUT.body,
                        postcard: {
                            message: "Hello",
                            recipient: INPUT.body.letters[0].recipient,
                        },
                    },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
