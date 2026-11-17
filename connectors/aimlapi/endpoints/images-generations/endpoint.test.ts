import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "aimlapi#images/generations";
const CHAT = "aimlapi#chat/completions";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

const body = {
    model: "blackforestlabs/flux-dev",
    prompt: "a single red cube on a white background",
    num_images: 1,
};

Deno.test(`${ID} happy (recorded): one image, the vendor credit meter is the bill`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}image-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // 65,000 credits x $0.0000005 = the claimed $0.0325 — the same rate
    // the chat chain shows, which is why both can meter `credits_used`
    assertEquals(result.usage, {
        credits: { default: 0.0325 },
        evidence: { CREDIT: 65000 },
    });
    const output = result.output as Record<string, unknown>;
    const data = output.data as Record<string, unknown>[];
    assertEquals(data.length, 1);
    assertEquals(
        (data[0].url as string).startsWith("https://s3.aimlapi.com/"),
        true,
    );
    const meta = output.meta as Record<string, unknown>;
    assertEquals("usage" in meta, false);
});

Deno.test(`${ID} the meter is a GATEWAY fact: one interned evidence fn serves both billable endpoints`, async () => {
    const image = await testSealedUnit(ID);
    const chat = await testSealedUnit(CHAT);
    // identical fn sources intern to ONE fnTable entry — the byte-identical
    // `meta.usage.credits_used` read is deliberate, not duplication
    assertEquals(
        image.doc.usage.evidence.$fn.key,
        chat.doc.usage.evidence.$fn.key,
    );
    // the ESTIMATES are the two docs' own, and differ
    assertEquals(
        image.doc.usage.estimate.$fn.key === chat.doc.usage.estimate.$fn.key,
        false,
    );
});

Deno.test(`${ID} estimate: the pinned $1.50-per-image ceiling, counted off either spelling`, async () => {
    const unit = await testSealedUnit(ID);
    // $1.50 = 3,000,000 credits per image: the dearest per-generation
    // price on the vendor's published card ($1.04) rounded up
    assertEquals(await estimateEndpoint(unit, { body }), {
        credits: { default: 1.5 },
        evidence: { CREDIT: 3_000_000 },
    });
    // no count knob at all: the vendor default of 1 holds for one image
    const bare = await estimateEndpoint(unit, {
        body: { model: "google/gemini-nano-banana-2.1", prompt: "a cube" },
    });
    assertEquals(bare.evidence, { CREDIT: 3_000_000 });
    // the fal-shaped spelling
    assertEquals(
        (await estimateEndpoint(unit, { body: { ...body, num_images: 4 } }))
            .evidence,
        { CREDIT: 12_000_000 },
    );
    // the OpenAI-shaped spelling
    assertEquals(
        (await estimateEndpoint(unit, {
            body: { model: "openai/gpt-image-2", prompt: "a cube", n: 3 },
        })).evidence,
        { CREDIT: 9_000_000 },
    );
    // both present: the hold takes the larger, since the gateway decides
    // which one the chosen model reads
    assertEquals(
        (await estimateEndpoint(unit, {
            body: { ...body, n: 2, num_images: 4 },
        })).evidence,
        { CREDIT: 12_000_000 },
    );
});

Deno.test(`${ID} provider error (recorded 401): zero usage, digested error`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: {
            // the shared 401 chain's recorded body is the chat one; this
            // endpoint's wire body differs, and replay matches on method
            // and url only, so the shared chain serves here unchanged
            ...await loadFixture(`${chains}unauthorized.json`),
        },
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

Deno.test(`${ID} schema gate: model and prompt are required, model-specific keys ride through`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}image-ok.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { model: body.model } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { prompt: body.prompt } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // an empty prompt is not a prompt
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { body: { model: body.model, prompt: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // the near-twin that must PASS: the body is a loose mirror, so a
    // model's own vocabulary (here flux's `image_size` / `seed`) clears
    // the gate rather than being rejected or silently dropped
    const estimate = await estimateEndpoint(unit, {
        body: {
            ...body,
            image_size: "landscape_16_9",
            seed: 7,
            num_inference_steps: 28,
        },
    });
    assertEquals(estimate.evidence, { CREDIT: 3_000_000 });
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
        const output = result.output as Record<string, unknown>;
        assertEquals(Array.isArray(output.data), true);
        assertEquals(Object.keys(result.usage.evidence), ["CREDIT"]);
        assertEquals("mismatch" in result.usage, false);
    },
});
