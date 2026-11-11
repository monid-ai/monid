import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";
import { CALCULATOR_CASES, INPUT, REFERENCES } from "../../test-data.ts";

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "openai#v1/image/gpt-image-2.5-flare-edit";
const input = { ...INPUT, images: REFERENCES };

Deno.test(`${ID}: executes native JSON with fixed model, auth and PNG encoding`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}synthetic-image-ok.json`);
    const response = fixture.calls[0].res;
    const sent: {
        url: string;
        method: string;
        headers: Headers;
        body: unknown;
    }[] = [];
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                sent.push({
                    url: String(url),
                    method: init?.method ?? "GET",
                    headers: new Headers(init?.headers),
                    body: JSON.parse(String(init?.body)),
                });
                return Promise.resolve(
                    Response.json(response.body, { status: response.status }),
                );
            },
        }),
    }).load(unit);
    const result = await loaded.run({
        body: {
            ...input,
            background: "transparent",
            mask: "https://example.com/mask.png",
        },
    });
    assertEquals(sent.length, 1);
    assertEquals(sent[0].url, "https://api.openai.com/v1/images/edits");
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].headers.get("authorization"), "Bearer test-key");
    assertEquals(sent[0].headers.get("content-type"), "application/json");
    assertEquals(sent[0].body, {
        ...INPUT,
        background: "transparent",
        model: "gpt-image-2.5-flare",
        n: 1,
        output_format: "png",
        stream: false,
        images: REFERENCES.map((image_url) => ({ image_url })),
        mask: { image_url: "https://example.com/mask.png" },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, response.body);
    assertEquals(result.usage, {
        credits: { default: 0.01398 },
        evidence: {
            input_text_token: 20,
            input_image_token: 1000,
            output_image_token: 196,
        },
    });
});

Deno.test(`${ID}: estimates validated caller input before wire conversion`, async () => {
    const unit = await testSealedUnit(ID);
    const estimate = await estimateEndpoint(unit, { body: input });
    assertEquals(estimate.evidence, {
        input_text_token: INPUT.prompt.length,
        input_image_token: 3000,
        output_image_token: 196,
    });
    const masked = await estimateEndpoint(unit, {
        body: { ...input, mask: "https://example.com/mask.png" },
    });
    assertEquals(masked.evidence.input_image_token, 4500);
});

Deno.test(`${ID}: provider errors preserve vendor bodies and bill zero`, async () => {
    const unit = await testSealedUnit(ID);
    for (const name of ["moderation-blocked", "http-error", "download-error"]) {
        const fixture = await loadFixture(`${FIXTURES}synthetic-${name}.json`);
        const result = await runEndpoint({
            unit,
            input: { body: input },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, fixture.calls[0].res.status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    }
});

Deno.test(`${ID}: invalid knobs fail before IO and their valid twin estimates`, async () => {
    const unit = await testSealedUnit(ID);
    const invalid: RunInput["body"][] = [
        { ...input, prompt: "" },
        { ...input, prompt: "x".repeat(32001) },
        { ...input, size: "auto" },
        { ...input, size: "1024" },
        { ...input, quality: "auto" },
        { ...input, model: "gpt-image-2" },
        { ...input, n: 2 },
        { ...input, output_format: "jpeg" },
        { ...input, stream: true },
        Object.fromEntries(
            Object.entries(input).filter(([key]) => key !== "size"),
        ) as RunInput["body"],
        Object.fromEntries(
            Object.entries(input).filter(([key]) => key !== "quality"),
        ) as RunInput["body"],
        { ...input, images: [] },
        { ...input, images: Array(17).fill(REFERENCES[0]) },
        { ...input, images: ["http://example.com/a.png"] },
        { ...input, images: ["https://?"] },
        { ...input, images: ["https://#"] },
        { ...input, mask: "https://?" },
        { ...input, mask: "https://#" },
        { ...input, images: [{ image_url: REFERENCES[0] }] },
        { ...input, mask: "data:image/png;base64,abc" },
        Object.fromEntries(
            Object.entries(input).filter(([key]) => key !== "images"),
        ) as RunInput["body"],
    ];
    for (const body of invalid) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    const accepted = await estimateEndpoint(unit, { body: input });
    assertEquals(accepted.evidence.output_image_token, 196);
});

Deno.test(`${ID}: size and quality match the official output token calculator`, async () => {
    const unit = await testSealedUnit(ID);
    for (
        const [size, quality, expected]
            of CALCULATOR_CASES["gpt-image-2.5-flare"]
    ) {
        const estimate = await estimateEndpoint(unit, {
            body: { ...input, size, quality },
        });
        assertEquals(
            estimate.evidence.output_image_token,
            expected,
            `${size} ${quality}`,
        );
    }
});

Deno.test({
    name: `${ID}: live PNG shape (gated on OPENAI_CREDENTIALS_API_KEY)`,
    ignore: liveSkip("openai"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    ...INPUT,
                    images: [
                        "https://cdn.openai.com/API/docs/images/body-lotion.png",
                    ],
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as { data?: { b64_json?: unknown }[] };
        assert(Array.isArray(output.data));
        assertEquals(output.data.length, 1);
        assertEquals(typeof output.data[0].b64_json, "string");
        assertEquals(typeof result.usage.evidence.input_text_token, "number");
        assertEquals(typeof result.usage.evidence.input_image_token, "number");
        assertEquals(typeof result.usage.evidence.output_image_token, "number");
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
