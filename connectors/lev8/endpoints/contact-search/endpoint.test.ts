import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "lev8#v1/contact-search";
const OBJECTIVE = "Find the work email of Jane Smith, VP of Engineering at " +
    "Acme Corp. Owner signals: linkedin_url=https://www.linkedin.com/in/x";

Deno.test("lev8#v1/contact-search found (recorded): email bills 10, phone bills 30", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}contact-found.json`,
    );
    // literal rates from docs.lev8.com/guides/billing (2026-10-16)
    const rows: [string, number, string][] = [
        ["email", 10, "email_found"],
        ["phone", 30, "phone_found"],
    ];
    for (const [contactType, credits, line] of rows) {
        const result = await runEndpoint({
            unit,
            input: {
                body: { contact_type: contactType, objective: OBJECTIVE },
            },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, contactType);
        assertEquals(result.isProviderError, false, contactType);
        assertEquals(result.usage, {
            credits: { default: credits },
            evidence: { [line]: 1 },
        }, contactType);
    }
});

Deno.test("lev8#v1/contact-search not found (recorded): null content bills 0", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { contact_type: "phone", objective: OBJECTIVE } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}contact-not-found.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: {},
        evidence: { phone_found: 0 },
    });
});

Deno.test("lev8#v1/contact-search provider error (recorded 401): data, zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { contact_type: "phone", objective: OBJECTIVE } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}unauthorized.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("lev8#v1/contact-search: estimate holds the requested line", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, {
            body: { contact_type: "email", objective: OBJECTIVE },
        }),
        { credits: { default: 10 }, evidence: { email_found: 1 } },
    );
    assertEquals(
        await estimateEndpoint(unit, {
            body: { contact_type: "phone", objective: OBJECTIVE },
        }),
        { credits: { default: 30 }, evidence: { phone_found: 1 } },
    );
});

Deno.test("lev8#v1/contact-search: type enum, objective 1–4000, strict body", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}contact-found.json`,
    );
    const rejected: Json[] = [
        {},
        { contact_type: "email" },
        { objective: OBJECTIVE },
        { contact_type: "linkedin", objective: OBJECTIVE },
        { contact_type: "email", objective: "" },
        { contact_type: "email", objective: "x".repeat(4001) },
        { contact_type: "email", objective: OBJECTIVE, lightweight: false },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body).slice(0, 80),
        );
    }
});

Deno.test({
    name: "lev8#v1/contact-search live (gated on LEV8_API_KEY)",
    ignore: liveSkip("lev8"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    contact_type: "email",
                    objective: "Find the work email of Sam Altman, CEO of " +
                        "OpenAI. Owner signals: x=sama",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["email_found"]);
    },
});
