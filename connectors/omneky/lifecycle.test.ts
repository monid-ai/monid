import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput>;
const IMAGE = "omneky#v1/image-ad";
const VIDEO = "omneky#v1/video-ad";

const run = async (id: string, input: string, name: string) =>
    await runEndpoint({
        unit: await testSealedUnit(id),
        input: INPUTS[input],
        mode: "replay",
        fixture: await loadFixture(`${HERE}fixtures/${name}.json`),
    });

Deno.test("omneky: image ad polls to SUCCESS and settles 5 credits", async () => {
    const result = await run(IMAGE, "image-ad", "synthetic-image-succeeded");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { image_1k: 1 },
    });
    const output = result.output as { status: string; result_url: string };
    assertEquals(output.status, "SUCCESS");
    assertEquals(
        output.result_url,
        "https://cdn.example.com/synthetic/omneky-image-ad.png",
    );
});

Deno.test("omneky: a 4K image ad settles 10 credits on the 4K line", async () => {
    const input = structuredClone(INPUTS["image-ad"]) as {
        body: { generation_metadata: Record<string, unknown> };
    };
    input.body.generation_metadata.resolution = "4K";
    const result = await runEndpoint({
        unit: await testSealedUnit(IMAGE),
        input: input as unknown as RunInput,
        mode: "replay",
        fixture: await loadFixture(
            `${HERE}fixtures/synthetic-image-4k-succeeded.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 10 },
        evidence: { image_4k: 1 },
    });
});

Deno.test("omneky: an omitted resolution goes on the wire as 1K", async () => {
    const sent: Json[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_input, init) => {
                sent.push(JSON.parse(String(init?.body)));
                return Promise.resolve(
                    new Response(JSON.stringify({ detail: "stop here" }), {
                        status: 402,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(IMAGE));
    await loaded.run({
        body: { brand_metadata: { brand_url: "https://example.com" } },
    });
    assertEquals(sent, [{
        brand_metadata: { brand_url: "https://example.com" },
        generation_metadata: { resolution: "1K" },
    }]);
});

Deno.test("omneky: a FAILED image job is a provider error with zero usage", async () => {
    const result = await run(IMAGE, "image-ad", "synthetic-image-failed");
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("omneky: an unrecognized status keeps polling until SUCCESS", async () => {
    const result = await run(
        IMAGE,
        "image-ad",
        "synthetic-image-unknown-status",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { image_1k: 1 },
    });
});

Deno.test("omneky: video ad polls to SUCCESS and settles 10 credits", async () => {
    const result = await run(VIDEO, "video-ad", "synthetic-video-succeeded");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 10 },
        evidence: { CALL: 1 },
    });
    const output = result.output as { type: string; result_url: string };
    assertEquals(output.type, "video_ad");
    assert(output.result_url.endsWith(".mp4"));
});

Deno.test("omneky: a FAILED video job is a provider error with zero usage", async () => {
    const result = await run(VIDEO, "video-ad", "synthetic-video-failed");
    assertEquals(result.httpStatus, 500);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("omneky: a rejected submit (402 / 401) does not poll or bill", async () => {
    for (
        const [name, status] of [
            ["synthetic-start-insufficient-credits", 402],
            ["synthetic-start-unauthorized", 401],
        ] as const
    ) {
        const result = await run(IMAGE, "image-ad", name);
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    }
});

Deno.test("omneky: the input schemas reject before the wire", async () => {
    const image = await testSealedUnit(IMAGE);
    const video = await testSealedUnit(VIDEO);
    // No fixture: any upstream call fails the test.
    const rejects = async (
        unit: typeof image,
        body: Json,
        why: string,
    ) => {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    const brand = { brand_url: "https://example.com" };
    await rejects(image, {}, "missing brand_metadata");
    await rejects(image, { brand_metadata: brand, no_of_ads: 3 }, "no_of_ads");
    await rejects(
        image,
        { brand_metadata: brand, callback_url: "https://x.test/hook" },
        "callback_url",
    );
    await rejects(
        image,
        { brand_metadata: brand, generation_metadata: { resolution: "2K" } },
        "unpriced resolution",
    );
    await rejects(
        image,
        { brand_metadata: brand, product_metadata: { product_name: "x" } },
        "product_metadata without product_images",
    );
    await rejects(
        image,
        {
            brand_metadata: brand,
            ad_copies: [{ copy_type: "x", copy_text: "y" }],
        },
        "unknown copy_type",
    );
    const product = { product_images: ["https://cdn.example.com/a.jpg"] };
    await rejects(
        video,
        {
            brand_metadata: brand,
            product_metadata: product,
            generation_metadata: { target_duration: 20 },
        },
        "duration over 15",
    );
    await rejects(
        video,
        {
            brand_metadata: brand,
            product_metadata: { product_images: [] },
            generation_metadata: { target_duration: 12 },
        },
        "no product images",
    );
    await rejects(
        video,
        { brand_metadata: brand, product_metadata: product },
        "missing generation_metadata",
    );
});

Deno.test({
    name: "omneky live: generates a real image ad and settles 5 credits",
    ignore: liveSkip("omneky"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(IMAGE),
            input: INPUTS["image-ad"],
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        const output = result.output as { status: string };
        assertEquals(output.status, "SUCCESS");
        assertEquals(result.usage, {
            credits: { default: 5 },
            evidence: { image_1k: 1 },
        });
    },
});
