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
import { CALCULATOR_CASES, INPUT } from "../../test-data.ts";

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "openai#v1/image/gpt-image-2";

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
            ...INPUT,
            background: "transparent",
        },
    });
    assertEquals(sent.length, 1);
    assertEquals(sent[0].url, "https://api.openai.com/v1/images/generations");
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].headers.get("authorization"), "Bearer test-key");
    assertEquals(sent[0].headers.get("content-type"), "application/json");
    assertEquals(sent[0].body, {
        ...INPUT,
        background: "transparent",
        model: "gpt-image-2",
        n: 1,
        output_format: "png",
        stream: false,
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
    const estimate = await estimateEndpoint(unit, { body: INPUT });
    assertEquals(estimate.evidence, {
        input_text_token: INPUT.prompt.length,
        input_image_token: 0,
        output_image_token: 196,
    });
});

Deno.test(`${ID}: provider errors preserve vendor bodies and bill zero`, async () => {
    const unit = await testSealedUnit(ID);
    for (const name of ["moderation-blocked", "http-error"]) {
        const fixture = await loadFixture(`${FIXTURES}synthetic-${name}.json`);
        const result = await runEndpoint({
            unit,
            input: { body: INPUT },
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
        { ...INPUT, prompt: "" },
        { ...INPUT, prompt: "x".repeat(32001) },
        { ...INPUT, size: "auto" },
        { ...INPUT, size: "1024" },
        { ...INPUT, quality: "auto" },
        { ...INPUT, model: "gpt-image-2" },
        { ...INPUT, n: 2 },
        { ...INPUT, output_format: "jpeg" },
        { ...INPUT, stream: true },
        Object.fromEntries(
            Object.entries(INPUT).filter(([key]) => key !== "size"),
        ) as RunInput["body"],
        Object.fromEntries(
            Object.entries(INPUT).filter(([key]) => key !== "quality"),
        ) as RunInput["body"],
        { ...INPUT, quality: "xhigh" },
        { ...INPUT, quality: "max" },
    ];
    for (const body of invalid) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    const accepted = await estimateEndpoint(unit, { body: INPUT });
    assertEquals(accepted.evidence.output_image_token, 196);
});

Deno.test(`${ID}: size and quality match the official output token calculator`, async () => {
    const unit = await testSealedUnit(ID);
    for (const [size, quality, expected] of CALCULATOR_CASES["gpt-image-2"]) {
        const estimate = await estimateEndpoint(unit, {
            body: { ...INPUT, size, quality },
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
            input: { body: INPUT },
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
