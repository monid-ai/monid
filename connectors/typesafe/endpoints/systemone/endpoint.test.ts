import { assert, assertEquals, assertRejects } from "@std/assert";
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

/**
 * typesafe#systemone through the compiled doc. Fixtures are SYNTHETIC,
 * shaped from docs.typesafe.ai/api.
 *
 * Rate under test: $42 per billion input tokens, output tokens free
 * (https://docs.typesafe.ai/models, checked 2026-10-22).
 */

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${FIXTURES}${name}.json`);
const ID = "typesafe#systemone";
const QUESTIONS = {
    refund: {
        type: "noul",
        instructions: "Is the customer asking for a refund?",
    },
    topic: {
        type: "choice",
        criteria: { billing: null, shipping: null, other: null },
    },
};
const TICKET = {
    body: {
        state: "Customer: my card was charged twice for order 1234.",
        questions: QUESTIONS,
    },
};

Deno.test("typesafe#systemone happy: bills the vendor's input tokens; the answer relays whole", async () => {
    const happy = await fixture("synthetic-systemone-happy");
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: TICKET,
        mode: "replay",
        fixture: happy,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 412 * 0.000000042 },
        evidence: { TOKEN: 412 },
    });
    // no billing field is lifted out: the vendor's token counts stay, as
    // the caller's own receipt, and the two answers arrive whole
    assertEquals(result.output, happy.calls[0].res.body);
});

Deno.test("typesafe#systemone provider error: a 422 is data, zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { state: "x", questions: {} } },
        mode: "replay",
        fixture: await fixture("synthetic-systemone-invalid"),
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("typesafe#systemone schema gate: box questions, assets, and 11 score levels are rejected", async () => {
    const unit = await testSealedUnit(ID);
    const levels = (n: number) => Array.from({ length: n }, (_, i) => `L${i}`);
    for (
        const body of [
            { state: "x", questions: { where: { type: "box" } } },
            {
                state: "x",
                questions: QUESTIONS,
                assets: { logo: { type: "image", data_base64: "AAAA" } },
            },
            {
                state: "x",
                questions: { rate: { type: "score", criteria: levels(11) } },
            },
        ] as Record<string, Json>[]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    // near-twins: ten score levels, and the vendor's nullable fields
    for (
        const body of [
            {
                state: "x",
                questions: { rate: { type: "score", criteria: levels(10) } },
            },
            {
                state: "x",
                questions: {
                    yes: { type: "noul", instructions: null, criteria: null },
                },
            },
            {
                state: "x",
                questions: {
                    yes: {
                        type: "noul",
                        criteria: { true: "refund", false: null },
                    },
                },
            },
        ] as Record<string, Json>[]
    ) {
        await assertInputAccepted({ unit, input: { body }, mode: "replay" });
    }
});

Deno.test("typesafe#systemone estimate: the body's UTF-8 byte count", async () => {
    const unit = await testSealedUnit(ID);
    // the binding materializes model "jev-latest" before the estimate
    const ascii = await estimateEndpoint(unit, TICKET);
    const bytes = new TextEncoder().encode(
        JSON.stringify({ ...TICKET.body, model: "jev-latest" }),
    ).length;
    assertEquals(ascii.evidence, { TOKEN: bytes });
    // non-ASCII counts in bytes, not characters: "退款" is 6 UTF-8 bytes
    const cjk = await estimateEndpoint(unit, {
        body: { state: "退款", questions: QUESTIONS },
    });
    const cjkBytes = new TextEncoder().encode(
        JSON.stringify({
            state: "退款",
            questions: QUESTIONS,
            model: "jev-latest",
        }),
    ).length;
    assertEquals(cjk.evidence, { TOKEN: cjkBytes });
});

Deno.test({
    name: "typesafe#systemone live (gated on TYPESAFE_API_KEY)",
    ignore: liveSkip("typesafe"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: TICKET,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, Json>;
        assertEquals(typeof output.model, "string");
        const answers = output.answers as Record<string, Record<string, Json>>;
        assertEquals(answers.refund.type, "noul");
        assertEquals(typeof answers.refund.noul, "number");
        assertEquals(answers.topic.type, "choice");
        assert(["billing", "shipping", "other"].includes(
            answers.topic.choice as string,
        ));
        const usage = output.usage as Record<string, Json>;
        assertEquals(typeof usage.input_tokens, "number");
        assertEquals(Object.keys(result.usage.evidence), ["TOKEN"]);
    },
});
