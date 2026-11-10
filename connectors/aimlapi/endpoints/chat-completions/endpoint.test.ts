import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "aimlapi#chat/completions";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

const body = {
    model: "openai/gpt-4o-mini",
    messages: [
        { role: "system", content: "Answer in one short sentence." },
        { role: "user", content: "What is the capital of Portugal?" },
    ],
    max_tokens: 40,
};

// the two prompt strings, in UTF-8 bytes (both pure ASCII here)
const PROMPT_BYTES = "Answer in one short sentence.".length +
    "What is the capital of Portugal?".length;

Deno.test(`${ID} happy (recorded): the vendor credit meter is the bill, meta.usage stripped`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}chat-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // meta.usage {credits_used: 21, usd_spent: 1.05e-05}: 21 credits of
    // evidence x $0.0000005 = the claimed $0.0000105, so the derived fold
    // equals the claim and no mismatch rides out
    assertEquals(result.usage, {
        credits: { default: 0.0000105 },
        evidence: { CREDIT: 21 },
    });
    const output = result.output as Record<string, unknown>;
    const meta = output.meta as Record<string, unknown>;
    assertEquals("usage" in meta, false);
    // the caller's own token counts are NOT the vendor's meter and survive
    const usage = output.usage as Record<string, unknown>;
    assertEquals(usage.total_tokens, 31);
    const choices = output.choices as Record<string, unknown>[];
    assertEquals(choices.length, 1); // the fixture's
    const message = choices[0].message as Record<string, unknown>;
    assertEquals(message.content, "The capital of Portugal is Lisbon.");
});

Deno.test(`${ID} estimate: the hold is the pinned ceiling and covers the recorded settle`, async () => {
    const unit = await testSealedUnit(ID);
    const hold = await estimateEndpoint(unit, { body });
    const settled = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}chat-ok.json`),
    });
    // 61 prompt bytes + 1,000 tokens of gateway overhead at 500 credits
    // per token, plus 40 output tokens x n=1 at 2,000. Both rates are the
    // dearest chat model on the vendor's published card rounded up
    // (openai/o1-pro: 412.62 in, 1,650.48 out — see the endpoint doc).
    assertEquals(hold.evidence, {
        CREDIT: (PROMPT_BYTES + 1_000) * 500 + 40 * 2_000,
    });
    // 21 credits were actually billed — three orders of magnitude inside
    // the hold, which is the point of a ceiling
    assertEquals(
        (hold.credits.default ?? 0) >= (settled.usage.credits.default ?? 0),
        true,
    );
});

Deno.test(`${ID} estimate: tools, schemas, images and n raise the hold`, async () => {
    const unit = await testSealedUnit(ID);
    const base = await estimateEndpoint(unit, { body });
    const tools = [{
        type: "function",
        function: {
            name: "get_weather",
            parameters: {
                type: "object",
                properties: { city: { type: "string" } },
            },
        },
    }];
    const withTools = await estimateEndpoint(unit, {
        body: { ...body, tools },
    });
    assertEquals(
        (withTools.evidence.CREDIT ?? 0) - (base.evidence.CREDIT ?? 0),
        JSON.stringify(tools).length * 500,
    );
    const withImage = await estimateEndpoint(unit, {
        body: {
            ...body,
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: "What is in this image?" },
                    {
                        type: "image_url",
                        image_url: { url: "https://example.com/a.png" },
                    },
                ],
            }],
        },
    });
    // the image URL is not counted as text; the image is 8,000 tokens
    assertEquals(
        withImage.evidence.CREDIT,
        ("What is in this image?".length + 1_000 + 8_000) * 500 +
            40 * 2_000,
    );
    // n multiplies the OUTPUT half only
    const withN = await estimateEndpoint(unit, { body: { ...body, n: 3 } });
    assertEquals(
        (withN.evidence.CREDIT ?? 0) - (base.evidence.CREDIT ?? 0),
        2 * 40 * 2_000,
    );
});

Deno.test(`${ID} provider error (recorded 404): zero usage, digested error`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                model: "nope/not-a-model",
                messages: [{ role: "user", content: "hi" }],
                max_tokens: 10,
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}model-not-found.json`),
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "Model not found");
});

Deno.test(`${ID} provider error (recorded 401): zero usage, digested error`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                model: "openai/gpt-4o-mini",
                messages: [{ role: "user", content: "hi" }],
                max_tokens: 40,
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}unauthorized.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(
        (output.message as string).startsWith(
            "This request requires a valid API key",
        ),
        true,
    );
});

Deno.test(`${ID} provider error (429): no usage`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: {
            name: "synthetic-chat-completions-rate-limited",
            description: "An AI/ML API 429 must not bill chat usage.",
            calls: [{
                req: { method: "POST", url: unit.doc.request.url },
                res: {
                    status: 429,
                    body: {
                        title: "Too Many Requests",
                        status: 429,
                        message: "Free-tier limit exceeded",
                        error: {
                            name: "TooManyRequestsException",
                            message: "Free-tier limit exceeded",
                        },
                    },
                },
            }],
        },
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.message, "Free-tier limit exceeded");
});

Deno.test(`${ID} schema gate: max_tokens is required, a valid body passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}chat-ok.json`);
    const { max_tokens: _, ...unbounded } = body;
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: unbounded },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // an unknown role is not a message this gateway accepts
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    body: {
                        ...body,
                        messages: [{ role: "developer", content: "hi" }],
                    },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // ...and neither is a zero cap
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { ...body, max_tokens: 0 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // passing near-twin: the recorded body itself clears the gate and
    // reaches the wire (the binding materializes n: 1, which is what the
    // recorded request carries)
    const ok = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: `${ID} live (gated on AIMLAPI_API_KEY)`,
    ignore: liveSkip("aimlapi"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // shape, not amounts: choices came back, the meter became evidence
        const output = result.output as Record<string, unknown>;
        assertEquals(Array.isArray(output.choices), true);
        const meta = output.meta as Record<string, unknown>;
        assertEquals("usage" in meta, false);
        assertEquals(Object.keys(result.usage.evidence), ["CREDIT"]);
        assertEquals(typeof result.usage.evidence.CREDIT, "number");
        // the claim and the fold agree to 1e-9, so no mismatch is reported
        assertEquals("mismatch" in result.usage, false);
    },
});
