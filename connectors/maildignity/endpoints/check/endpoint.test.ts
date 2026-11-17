import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "maildignity#check";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy pass (synthetic): one credit, verdict PASS`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-check-pass.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                email_text:
                    "Hi Alex,\n\nI saw your recent post about sales outreach. Would you be open to a quick exchange next week?\n\nBest,\nEnrico",
                mode: "full",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} happy review with issues (synthetic): one credit, verdict REVIEW, repaired_body returned`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-check-review.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                email_text:
                    "Hey Alex, let's talk Tuesday at 2pm. I know you're struggling with lead gen.",
                mode: "full",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} provider error (synthetic 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                email_text: "Test email draft",
                mode: "full",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-unauthorized.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, {
        message: "Invalid or missing API key",
        raw: { error: "Invalid or missing API key" },
    });
});

Deno.test(`${ID} schema gate: accepts valid email_text, optional prospect, and rejects invalid inputs`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-check-pass.json`);

    // Passing near-twin: valid email_text without mode is accepted
    const validRun = await runEndpoint({
        unit,
        input: {
            body: {
                email_text:
                    "Hi Alex,\n\nI saw your recent post about sales outreach. Would you be open to a quick exchange next week?\n\nBest,\nEnrico",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-check-pass.json`),
    });
    assertEquals(validRun.httpStatus, 200);

    // Passing: full prospect payload (name, company, role) is accepted through runEndpoint
    const prospectRun = await runEndpoint({
        unit,
        input: {
            body: {
                email_text:
                    "Hi Alex,\n\nI saw your recent post about sales outreach. Would you be open to a quick exchange next week?\n\nBest,\nEnrico",
                mode: "full",
                prospect: {
                    name: "Alex Mercer",
                    company: "Acme Corp",
                    role: "VP of Sales",
                },
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-check-pass.json`),
    });
    assertEquals(prospectRun.httpStatus, 200);

    // Assert input accepted for partial and full prospect variants
    const validVariants: Record<string, Json>[] = [
        {
            email_text: "Checking in.",
            prospect: { name: "Alex" },
        },
        {
            email_text: "Checking in.",
            prospect: { company: "Acme Corp" },
        },
        {
            email_text: "Checking in.",
            prospect: { role: "CTO" },
        },
        {
            email_text: "Checking in.",
            prospect: { name: "Alex", company: "Acme", role: "CEO" },
        },
    ];
    for (const ok of validVariants) {
        await assertInputAccepted({
            unit,
            input: { body: ok },
            mode: "replay",
            fixture: await loadFixture(`${chains}synthetic-check-pass.json`),
        });
    }

    // Rejection assertions: missing required email_text or empty
    await assertRejects(
        async () => {
            await runEndpoint({
                unit,
                input: { body: {} },
                mode: "replay",
                fixture,
            });
        },
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        async () => {
            await runEndpoint({
                unit,
                input: { body: { email_text: "" } },
                mode: "replay",
                fixture,
            });
        },
        Error,
        "INVALID_INPUT",
    );
    // Invalid mode
    await assertRejects(
        async () => {
            await runEndpoint({
                unit,
                input: {
                    body: { email_text: "hello", mode: "invalid_mode" },
                },
                mode: "replay",
                fixture,
            });
        },
        Error,
        "INVALID_INPUT",
    );
    // Unknown top-level key (strict)
    await assertRejects(
        async () => {
            await runEndpoint({
                unit,
                input: {
                    body: { email_text: "hello", unknown_key: true },
                },
                mode: "replay",
                fixture,
            });
        },
        Error,
        "INVALID_INPUT",
    );
    // Invalid prospect type (not object)
    await assertRejects(
        async () => {
            await runEndpoint({
                unit,
                input: {
                    body: { email_text: "hello", prospect: "Alex" },
                },
                mode: "replay",
                fixture,
            });
        },
        Error,
        "INVALID_INPUT",
    );
    // Unknown key inside prospect (strictObject)
    await assertRejects(
        async () => {
            await runEndpoint({
                unit,
                input: {
                    body: {
                        email_text: "hello",
                        prospect: { name: "Alex", invalid_field: "test" },
                    },
                },
                mode: "replay",
                fixture,
            });
        },
        Error,
        "INVALID_INPUT",
    );
});

Deno.test({
    name: `${ID} live (gated on MAILDIGNITY_API_KEY)`,
    ignore: liveSkip("maildignity"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    email_text: "Hello, checking in.",
                    mode: "fast",
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
        assertEquals(typeof output.verdict, "string");
    },
});
