import { assertAlmostEquals, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * typesafe#systemone through the compiled doc. Fixtures are SYNTHETIC,
 * shaped from docs.typesafe.ai/api.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const fixture = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);
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

Deno.test("typesafe#systemone: bills the vendor's input tokens at $42 per billion", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: TICKET,
        mode: "replay",
        fixture: await fixture("synthetic-systemone-happy"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.evidence, { TOKEN: 412 });
    assertAlmostEquals(result.usage.credits.default ?? 0, 412 * 0.000000042);
    const answers = (result.output as Record<string, Json>).answers as Record<
        string,
        Record<string, Json>
    >;
    assertEquals(answers.topic.choice, "billing");
});

Deno.test("typesafe#systemone: a 422 is a zero-billed provider error", async () => {
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

Deno.test("typesafe#systemone: the estimate is the body's UTF-8 byte count (a token ceiling)", async () => {
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
    },
});
