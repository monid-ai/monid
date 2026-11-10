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
const ID = "fuse#data/emails/verify";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("fuse#data/emails/verify: a charged verdict settles the 1 on its receipt", async () => {
    // Recorded for nobody@example.com; the recorder scrubs every address.
    const result = await run("email-verify-invalid.json", {
        email: "user@example.com",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    assertEquals(result.output, {
        email: "user@example.com",
        status: "invalid",
    });
});

Deno.test("fuse#data/emails/verify: an unknown verdict settles ZERO, as Fuse charged it", async () => {
    const result = await run("synthetic-email-verify-unknown.json", {
        email: "ops@ledgerline.example",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    assertEquals((result.output as Record<string, unknown>).status, "unknown");
});

Deno.test("fuse#data/emails/verify: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited.json", {
        email: "ada@northwind-payments.example",
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("fuse#data/emails/verify estimate: one verdict, at the plan's email_verify price", async () => {
    // The usage plan of the key Fuse issues to the platform, 2026-10-29.
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: { email: "ada@northwind-payments.example" },
    });
    assertEquals(usage.credits, { default: 1 });
});

Deno.test("fuse#data/emails/verify: the gate rejects an empty address, and passes a real one", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}email-verify-invalid.json`,
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { email: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertInputAccepted({
        unit,
        input: { body: { email: "ada@northwind-payments.example" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "fuse#data/emails/verify live: a check answers one of the four verdicts",
    ignore: liveSkip("fuse"),
    fn: async () => {
        // Fuse refuses an address under a top-level domain that does not
        // exist (`.example` answers 422 VALIDATION_FAILED), so the live check
        // sends RFC 2606's documentation domain, which sits under `.com`.
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { email: "nobody@example.com" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const status = (result.output as Record<string, unknown>).status;
        assert(
            ["valid", "invalid", "risky", "unknown"].includes(String(status)),
        );
    },
});
