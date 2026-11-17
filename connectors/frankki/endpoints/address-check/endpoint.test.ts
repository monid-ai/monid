import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test("frankki#address-check happy (recorded 2026-10-27): FREE, envelope unwrapped", async () => {
    const unit = await testSealedUnit("frankki#address-check");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // fromResponse returns the envelope's `data` and nothing else
    const body = fixture.calls[0].res.body as Record<string, unknown>;
    assertEquals(result.output, body.data);
    assertEquals(result.output, { valid: true, missingFields: [] });
});

Deno.test("frankki#address-check provider error (recorded 2026-10-27): wrong key is 401, zero usage", async () => {
    const unit = await testSealedUnit("frankki#address-check");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "UNAUTHORIZED");
    assertEquals(typeof output.message, "string");
    assertEquals((output.raw as Record<string, unknown>).status, "error");
});

Deno.test("frankki#address-check schema gate: name, street, city and ISO country required", async () => {
    const unit = await testSealedUnit("frankki#address-check");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        { street: "Teststrasse", city: "Berlin", country: "DE" },
        { name: "", street: "Teststrasse", city: "Berlin", country: "DE" },
        {
            name: "A",
            street: "Teststrasse",
            city: "Berlin",
            country: "Germany",
        },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    // near-twins: the gate is not wider than the vendor contract
    const accepted: Json[] = [
        { name: "A", street: "Teststrasse", city: "Berlin", country: "DE" },
        {
            name: "A",
            company: "B GmbH",
            street: "Teststrasse",
            city: "Berlin",
            country: "CH",
        },
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
    name: "frankki#address-check live (gated on FRANKKI_API_KEY)",
    ignore: liveSkip("frankki"),
    fn: async () => {
        const unit = await testSealedUnit("frankki#address-check");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    name: "FrankKi Test",
                    street: "Teststrasse",
                    houseNumber: "1",
                    zip: "10115",
                    city: "Berlin",
                    country: "DE",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assertEquals(typeof output.valid, "boolean");
        assert(Array.isArray(output.missingFields));
    },
});
