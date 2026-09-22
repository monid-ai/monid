import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const ID = "pieterpost#create-compose-link";
const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    body: {
        idempotencyKey: "compose-synthetic-001",
        recipient: {
            name: "Pieter Example",
            streetAddress: "Damrak 1",
            postalCode: "1012 LG",
            city: "Amsterdam",
            country: "NL",
        },
        message: "A letter prepared by an agent.",
        locale: "en" as const,
    },
};

Deno.test(`${ID} happy: maps idempotency to a header and stays free`, async () => {
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
    assertEquals(
        (result.output as Record<string, unknown>).mode,
        "compose_link",
    );
    assertEquals(
        fixture.calls[0].req.body &&
            "idempotencyKey" in
                (fixture.calls[0].req.body as Record<string, Json>),
        false,
    );
});

Deno.test(`${ID} provider error: invalid recipient is zero-billed`, async () => {
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
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} rejects an empty idempotency key before the wire`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    ...INPUT,
                    body: { ...INPUT.body, idempotencyKey: "" },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});
