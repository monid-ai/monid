import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, SealedUnit } from "@shared/core";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

import { INPUT, REFERENCES } from "./test-data.ts";

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const MODELS = [
    "gpt-image-2",
    "gpt-image-2.5-sunburst",
    "gpt-image-2.5-flare",
];
const PNG_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=";
const EPSILON = 1e-12;

async function fixture(name = "image-ok") {
    return await loadFixture(`${FIXTURES}synthetic-${name}.json`);
}

async function runBody(unit: SealedUnit, output: Json, status = 200) {
    return await runEndpoint({
        unit,
        input: { body: INPUT },
        mode: "replay",
        fixture: {
            name: "synthetic-response-variant",
            description:
                "Malformed or changed native Images API response envelope.",
            calls: [{
                req: { method: "POST", url: unit.doc.request.url },
                res: { status, body: output },
            }],
        },
    });
}

Deno.test("openai: catalog contains exactly the six public image endpoints", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("openai#")
    );
    assertEquals(
        ids.sort(),
        MODELS.flatMap((model) => [
            `openai#v1/image/${model}`,
            `openai#v1/image/${model}-edit`,
        ]).sort(),
    );
});

Deno.test("openai: shared estimate, receipt and lifecycle hooks intern once", async () => {
    const units = await Promise.all(MODELS.flatMap((model) => [
        testSealedUnit(`openai#v1/image/${model}`),
        testSealedUnit(`openai#v1/image/${model}-edit`),
    ]));
    const bundle = await testBundle();
    const estimateKeys = new Set(
        units.map((unit) => unit.doc.usage.estimate.$fn.key),
    );
    assertEquals(estimateKeys.size, 1);
    const estimateKey = units[0].doc.usage.estimate.$fn.key;
    assertEquals(bundle.fnTable[estimateKey].kind, "factory");
    assertEquals(
        new Set(
            units.map((unit) =>
                JSON.stringify(unit.doc.usage.estimate.$fn.args)
            ),
        ).size,
        4,
    );
    assertEquals(
        new Set(units.map((unit) => JSON.stringify(unit.doc.usage.evidence)))
            .size,
        1,
    );
    assertEquals(
        new Set(units.map((unit) => JSON.stringify(unit.doc.lifecycle?.start)))
            .size,
        1,
    );
});

// Standard direct Images API rates, USD per token; checked 2026-10-17.
// https://developers.openai.com/api/docs/pricing#image-generation-models
const RATE_TABLE = {
    input_text_token: 0.000005,
    input_image_token: 0.000008,
    output_image_token: 0.000030,
} as const;

Deno.test("openai: all six compiled rate cards match the cited Standard prices", async () => {
    for (const model of MODELS) {
        for (const suffix of ["", "-edit"]) {
            const unit = await testSealedUnit(
                `openai#v1/image/${model}${suffix}`,
            );
            const card = unit.doc.usage.model;
            assert(card.kind === "COMPOSITE");
            assertEquals(
                Object.keys(card.components).sort(),
                Object.keys(RATE_TABLE).sort(),
            );
            for (const [key, amount] of Object.entries(RATE_TABLE)) {
                const line = card.components[key];
                assert(line.kind === "PER_UNIT");
                assertEquals({
                    unit: line.unit,
                    every: line.every,
                    consumes: line.consumes,
                }, {
                    unit: "TOKEN",
                    every: 1,
                    consumes: { credit: "default", amount },
                });
            }
        }
    }
});

Deno.test("openai: UTF-8 prompt estimate handles Chinese, emoji and a lone surrogate", async () => {
    const unit = await testSealedUnit("openai#v1/image/gpt-image-2");
    const estimate = await estimateEndpoint(unit, {
        body: { ...INPUT, prompt: "a\u732b\u{1f436}\ud800" },
    });
    assertEquals(estimate.evidence.input_text_token, 11);
});

Deno.test("openai: admission estimates allow size errors to reach the zero-billed 400", async () => {
    for (const model of MODELS) {
        for (const edit of [false, true]) {
            const unit = await testSealedUnit(
                `openai#v1/image/${model}${edit ? "-edit" : ""}`,
            );
            let requests = 0;
            const loaded = await new Engine({
                transport: {
                    execute: () => {
                        requests++;
                        throw new Error(
                            "invalid dimensions must not reach transport",
                        );
                    },
                },
            }).load(unit);
            for (
                const size of [
                    "1000x1000",
                    "1025x1024",
                    "4000x1024",
                    "1024x256",
                    "512x512",
                    "3840x3840",
                    "999999999999999999999x1024",
                    "9".repeat(310) + "x1024",
                ]
            ) {
                const body = {
                    ...INPUT,
                    size,
                    ...(edit ? { images: REFERENCES } : {}),
                };
                const estimate = loaded.estimate({ body });
                assert(Number.isFinite(estimate.evidence.output_image_token));
                assert(estimate.evidence.output_image_token >= 0);
                assert(Number.isFinite(estimate.credits.default));
                const result = await loaded.run({ body });
                assertEquals(result.httpStatus, 400);
                assertEquals(result.isProviderError, true);
                assertEquals(result.output, {
                    error: {
                        code: "invalid_size",
                        message:
                            "Size must have 16px-aligned edges up to 3840px, " +
                            "aspect ratio at most 3:1 and 655360–8294400 pixels.",
                    },
                });
                assertEquals(result.usage, { credits: {}, evidence: {} });
            }
            assertEquals(requests, 0);
            for (
                const size of [
                    "640x1024",
                    "3840x2160",
                    "2160x3840",
                    "2048x2048",
                ]
            ) {
                const body = {
                    ...INPUT,
                    size,
                    ...(edit ? { images: REFERENCES } : {}),
                };
                const estimate = loaded.estimate({ body });
                assert(estimate.evidence.output_image_token > 0);
                const result = await runEndpoint({
                    unit,
                    input: { body },
                    mode: "replay",
                    fixture: await fixture(),
                });
                assertEquals(result.httpStatus, 200);
            }
        }
    }
});

Deno.test("openai: a 2xx in-body error is a zero-billed provider failure", async () => {
    const unit = await testSealedUnit("openai#v1/image/gpt-image-2");
    const error = { error: { code: "moderation_blocked", message: "blocked" } };
    const result = await runBody(unit, error);
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.output, error);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("openai: absent images and incomplete/invalid meters never bill", async () => {
    const unit = await testSealedUnit("openai#v1/image/gpt-image-2");
    const image = { data: [{ b64_json: PNG_BASE64 }] };
    const receipt = {
        usage: {
            input_tokens_details: { text_tokens: 20, image_tokens: 0 },
            output_tokens: 196,
        },
    };
    for (
        const output of [
            {},
            { ...receipt, data: [] },
            { ...receipt, data: [{ b64_json: "" }] },
            { ...receipt, data: [{ b64_json: " " }] },
            { ...receipt, data: [{ b64_json: "not-base64!" }] },
            { ...receipt, data: [{ b64_json: "aGVsbG8=" }] },
            { ...receipt, data: [{ b64_json: PNG_BASE64.slice(0, -1) }] },
            { ...receipt, data: [{ b64_json: PNG_BASE64 + "====" }] },
            {
                ...receipt,
                data: [{ url: "https://example.com/invalid-response.png" }],
            },
            image,
            { ...image, usage: { output_tokens: 196 } },
            { ...image, usage: { ...receipt.usage, output_tokens: -1 } },
            { ...image, usage: { ...receipt.usage, output_tokens: 1.5 } },
            { ...image, usage: { ...receipt.usage, output_tokens: "196" } },
            {
                ...image,
                usage: {
                    ...receipt.usage,
                    input_tokens_details: { text_tokens: 20 },
                },
            },
        ]
    ) {
        const result = await runBody(unit, output);
        assertEquals(result.httpStatus, 502);
        assertEquals(result.providerHttpStatus, 200);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    }
});

Deno.test("openai: settlement uses actual tokens even when estimate differs; no 1K rounding", async () => {
    const unit = await testSealedUnit("openai#v1/image/gpt-image-2");
    const body = {
        data: [{ b64_json: PNG_BASE64 }],
        usage: {
            input_tokens_details: { text_tokens: 1, image_tokens: 1 },
            output_tokens: 1,
        },
    };
    const result = await runBody(unit, body);
    assertEquals(result.usage.evidence, {
        input_text_token: 1,
        input_image_token: 1,
        output_image_token: 1,
    });
    assertAlmostEquals(result.usage.credits.default, 0.000043, EPSILON);
});

Deno.test("openai: maximum reference count preserves order and optional mask is omitted", async () => {
    const unit = await testSealedUnit(
        "openai#v1/image/gpt-image-2.5-flare-edit",
    );
    const images = Array.from(
        { length: 16 },
        (_, index) => `https://example.com/${index}.png`,
    );
    let sent: Record<string, Json> = {};
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_url, init) => {
                sent = JSON.parse(String(init?.body));
                return Promise.resolve(
                    Response.json({
                        data: [{ b64_json: PNG_BASE64 }],
                        usage: {
                            input_tokens_details: {
                                text_tokens: 1,
                                image_tokens: 16000,
                            },
                            output_tokens: 196,
                        },
                    }),
                );
            },
        }),
    }).load(unit);
    await loaded.run({ body: { ...INPUT, images } });
    assertEquals(sent.images, images.map((image_url) => ({ image_url })));
    assertEquals("mask" in sent, false);
    assertEquals("background" in sent, false);
    assertEquals(
        (await estimateEndpoint(unit, { body: { ...INPUT, images } })).evidence
            .input_image_token,
        24000,
    );
});
