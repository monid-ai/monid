import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "lev8#v1/enrich";

const BODY = {
    entity_context: "Company: OpenAI\nWebsite: https://openai.com",
    enrich_fields: {
        type: "object",
        properties: {
            company_summary: { type: "string" },
            ceo: { type: "string" },
        },
        required: ["company_summary", "ceo"],
    },
};

Deno.test("lev8#v1/enrich happy (recorded): 2 credits, answer follows the schema", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: BODY },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}enrich-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 1 },
    });
    assertEquals(
        (result.output as { answer: Record<string, unknown> }).answer.ceo,
        "Sam Altman",
    );
});

Deno.test("lev8#v1/enrich business failure (synthetic): success false bills 0", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: BODY },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-business-failure.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test("lev8#v1/enrich provider error (recorded 401): data, zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: BODY },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}unauthorized.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("lev8#v1/enrich: estimate promises one enrichment", async () => {
    assertEquals(
        await estimateEndpoint(await testSealedUnit(ID), { body: BODY }),
        { credits: { default: 2 }, evidence: { RESULT: 1 } },
    );
});

Deno.test("lev8#v1/enrich: both fields required, enrich_fields an object schema", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}enrich-ok.json`);
    const rejected: Json[] = [
        {},
        { entity_context: "OpenAI" },
        { enrich_fields: BODY.enrich_fields },
        { ...BODY, entity_context: "" },
        { ...BODY, enrich_fields: { type: "array", properties: {} } },
        { ...BODY, enrich_fields: { type: "object" } },
        { ...BODY, extra: 1 },
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
    // the inner JSON Schema stays open: `required`, `description`, nesting
    await assertInputAccepted({
        unit,
        input: {
            body: {
                entity_context: "Company: OpenAI",
                enrich_fields: {
                    type: "object",
                    description: "facts",
                    properties: {
                        founders: {
                            type: "array",
                            items: { type: "string" },
                        },
                    },
                    required: ["founders"],
                },
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "lev8#v1/enrich live (gated on LEV8_API_KEY)",
    ignore: liveSkip("lev8"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: BODY },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
    },
});
