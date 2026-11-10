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

Deno.test("frankki#compose happy (recorded 2026-10-27): FREE, envelope unwrapped", async () => {
    const unit = await testSealedUnit("frankki#compose");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                subject: "Monid Testbrief",
                content:
                    "Hallo,\ndies ist ein Testbrief. Bitte nicht versenden.\nViele Gruesse",
                sender: {
                    name: "FrankKi Test",
                    street: "Teststrasse",
                    houseNumber: "1",
                    zip: "10115",
                    city: "Berlin",
                    country: "DE",
                },
                recipient: {
                    name: "FrankKi Test",
                    street: "Teststrasse",
                    houseNumber: "1",
                    zip: "10115",
                    city: "Berlin",
                    country: "DE",
                },
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
    const output = result.output as Record<string, unknown>;
    assertEquals(output.draftToken, "dft_recorded000000000000000000000000");
    assertEquals(output.trackingToken, "trk_recorded000000000000000000000000");
});

Deno.test("frankki#compose provider error (recorded 2026-10-27): wrong key is 401, zero usage", async () => {
    const unit = await testSealedUnit("frankki#compose");
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                subject: "Monid Testbrief",
                content:
                    "Hallo,\ndies ist ein Testbrief. Bitte nicht versenden.\nViele Gruesse",
                sender: {
                    name: "FrankKi Test",
                    street: "Teststrasse",
                    houseNumber: "1",
                    zip: "10115",
                    city: "Berlin",
                    country: "DE",
                },
                recipient: {
                    name: "FrankKi Test",
                    street: "Teststrasse",
                    houseNumber: "1",
                    zip: "10115",
                    city: "Berlin",
                    country: "DE",
                },
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

Deno.test("frankki#compose content refused (synthetic): 422 keeps code and bilingual message", async () => {
    const unit = await testSealedUnit("frankki#compose");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-content-rejected.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                subject: "Monid Testbrief",
                content:
                    "Hallo,\ndies ist ein Testbrief. Bitte nicht versenden.\nViele Gruesse",
                sender: {
                    name: "FrankKi Test",
                    street: "Teststrasse",
                    houseNumber: "1",
                    zip: "10115",
                    city: "Berlin",
                    country: "DE",
                },
                recipient: {
                    name: "FrankKi Test",
                    street: "Teststrasse",
                    houseNumber: "1",
                    zip: "10115",
                    city: "Berlin",
                    country: "DE",
                },
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.code, "CONTENT_REJECTED");
    assert(String(output.message).includes("EN: "));
});

Deno.test("frankki#compose schema gate: subject, content, sender and recipient required", async () => {
    const unit = await testSealedUnit("frankki#compose");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        {
            subject: "",
            content: "x",
            sender: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
            recipient: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
        },
        {
            subject: "x",
            content: "x",
            sender: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
        },
        {
            subject: "x",
            content: "x",
            sender: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
            recipient: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
            language: "fr",
        },
        {
            subject: "x",
            content: "x",
            sender: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
            recipient: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
            pageCount: 96,
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
        {
            subject: "x",
            content: "x",
            sender: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
            recipient: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
        },
        {
            subject: "x",
            content: "x",
            sender: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
            recipient: {
                name: "FrankKi Test",
                street: "Teststrasse",
                houseNumber: "1",
                zip: "10115",
                city: "Berlin",
                country: "DE",
            },
            language: "en",
            pageCount: 95,
            color: true,
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
    name:
        "frankki#compose live (gated on FRANKKI_API_KEY) (stores an unpaid test draft)",
    ignore: liveSkip("frankki"),
    fn: async () => {
        const unit = await testSealedUnit("frankki#compose");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    subject: "Monid Testbrief",
                    content:
                        "Hallo,\ndies ist ein Testbrief. Bitte nicht versenden.\nViele Gruesse",
                    sender: {
                        name: "FrankKi Test",
                        street: "Teststrasse",
                        houseNumber: "1",
                        zip: "10115",
                        city: "Berlin",
                        country: "DE",
                    },
                    recipient: {
                        name: "FrankKi Test",
                        street: "Teststrasse",
                        houseNumber: "1",
                        zip: "10115",
                        city: "Berlin",
                        country: "DE",
                    },
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
        assertEquals(typeof output.draftToken, "string");
        assertEquals(typeof output.trackingToken, "string");
    },
});
