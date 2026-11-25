import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

/**
 * THE apimodels test suite (fixture strategy v2): two RECORDED chains (one
 * image task, one video task, 2026-11-25) plus six synthetic chains in the
 * recorded shape exercise every endpoint. Every apimodels endpoint posts to
 * `/v1/images/generations` or `/v1/video/generations` and polls the SAME
 * path with `?task_id=`, so `{{request.url}}` binds one chain to each
 * endpoint of its kind.
 *
 * The recordings came from an account with a 4% volume discount, so each
 * completed task's own receipt (`credits`) sits below the list fold: the
 * receipt WINS (D27) and the list price rides out as `mismatch.derived`.
 * That makes every happy-path row a two-sided check — the claim is the
 * recording's literal, the derived fold is the endpoint's literal list rate
 * typed by hand from https://apimodels.app/docs (2026-11-25), never
 * re-derived from the doc's own model.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput["body"]>;

/** The recorded receipts (USD actually charged). */
const IMAGE_CLAIM = 0.0211;
const VIDEO_CLAIM = 0.0768;

/**
 * THE LITERAL RATE TABLE for each endpoint's test input: evidence and the
 * list-price fold. Image inputs take the 1K default; Veo is one flat price
 * per video; the Seedance input asks for 4 s at 480p ($0.092/s).
 */
const HAPPY: Record<
    string,
    { evidence: Record<string, number>; derived: number; claim: number }
> = {
    "apimodels#v1/image/gpt-image-2": {
        evidence: { "1k": 1 },
        derived: 0.025,
        claim: IMAGE_CLAIM,
    },
    "apimodels#v1/image/nano-banana-2-1": {
        evidence: { "1k": 1 },
        derived: 0.022,
        claim: IMAGE_CLAIM,
    },
    "apimodels#v1/image/gemini-3-pro-image": {
        evidence: { "1k": 1 },
        derived: 0.08,
        claim: IMAGE_CLAIM,
    },
    "apimodels#v1/video/veo-3.1-fast-hd": {
        evidence: { CALL: 1 },
        derived: 0.08,
        claim: VIDEO_CLAIM,
    },
    "apimodels#v1/video/veo-3.1-fast-fhd": {
        evidence: { CALL: 1 },
        derived: 0.088,
        claim: VIDEO_CLAIM,
    },
    "apimodels#v1/video/seedance-2.0": {
        evidence: { "480p": 4 },
        derived: 0.368,
        claim: VIDEO_CLAIM,
    },
};

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

const endpointIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("apimodels#"))
        .sort();
};

const inputFor = (id: string): RunInput => {
    const body = INPUTS[id.split("#")[1]];
    assert(body !== undefined, `${id}: no test input in test-inputs.json`);
    return { body };
};

const chainFor = (id: string) =>
    id.includes("#v1/image/")
        ? `${HERE}fixtures/recorded-image-task-succeeded.json`
        : `${HERE}fixtures/recorded-video-task-succeeded.json`;

const replay = async (id: string, fixtureName: string, input?: RunInput) =>
    await runEndpoint({
        unit: await testSealedUnit(id),
        input: input ?? inputFor(id),
        mode: "replay",
        fixture: await loadFixture(`${HERE}fixtures/${fixtureName}.json`),
    });

Deno.test("apimodels: the literal rate table names exactly the endpoints", async () => {
    assertEquals(Object.keys(HAPPY).sort(), await endpointIds());
});

Deno.test("apimodels: every endpoint completes its recorded chain — the receipt wins, the list fold rides as mismatch", async () => {
    for (const id of await endpointIds()) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture: await loadFixture(chainFor(id)),
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        const row = HAPPY[id];
        assertEquals(result.usage.credits, { default: row.claim }, id);
        assertEquals(result.usage.evidence, row.evidence, id);
        const derived = result.usage.mismatch?.derived.default;
        assert(
            derived !== undefined && near(derived, row.derived),
            `${id}: derived ${derived} vs list ${row.derived}`,
        );
        const output = result.output as Record<string, unknown>;
        // D27: the receipt does not ride the payload…
        assert(!("credits" in output), `${id}: credits stripped`);
        assert(!("currency" in output), `${id}: currency stripped`);
        // …nor do the account id and the JSON-string echoes
        for (const key of ["userId", "param", "resultJson"]) {
            assert(!(key in output), `${id}: ${key} dropped`);
        }
        assertEquals(output.state, "completed", id);
        const urls = output.resultUrls as string[];
        assert(urls[0].startsWith("https://r2.apimodels.app/"), id);
        // engine-stamped timing: one processing poll + the terminal one
        assertEquals(result.timing.attempts, 2, id);
    }
});

Deno.test("apimodels: the image rate line follows the requested resolution", async () => {
    const rows: [string, string, string, number][] = [
        ["apimodels#v1/image/gpt-image-2", "2K", "2k", 0.03],
        ["apimodels#v1/image/gpt-image-2", "4K", "4k", 0.05],
        ["apimodels#v1/image/nano-banana-2-1", "4K", "4k", 0.06],
        ["apimodels#v1/image/gemini-3-pro-image", "4K", "4k", 0.13],
    ];
    for (const [id, resolution, key, list] of rows) {
        const body = inputFor(id).body as Record<string, Json>;
        const result = await replay(id, "recorded-image-task-succeeded", {
            body: { ...body, resolution },
        });
        assertEquals(result.usage.evidence, { [key]: 1 }, id);
        const derived = result.usage.mismatch?.derived.default;
        assert(derived !== undefined && near(derived, list), id);
    }
});

/** Estimates are PURE — a transport that rejects proves no IO happens. */
async function estimateFor(id: string, body: Json) {
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not do IO")),
        }),
    });
    const loaded = await engine.load(await testSealedUnit(id));
    return loaded.estimate({ body });
}

Deno.test("apimodels: estimates hold the list price of the requested tier", async () => {
    // no resolution: the binding materializes the 1K default
    assertEquals(
        await estimateFor("apimodels#v1/image/nano-banana-2-1", {
            prompt: "a cat",
        }),
        { credits: { default: 0.022 }, evidence: { "1k": 1 } },
    );
    assertEquals(
        await estimateFor("apimodels#v1/image/gpt-image-2", {
            prompt: "a cat",
            resolution: "4K",
        }),
        { credits: { default: 0.05 }, evidence: { "4k": 1 } },
    );
    assertEquals(
        await estimateFor("apimodels#v1/video/veo-3.1-fast-fhd", {
            prompt: "a cat",
        }),
        { credits: { default: 0.088 }, evidence: { CALL: 1 } },
    );
    // Seedance with no knobs: the vendor defaults, 720p × 8 s at $0.197/s
    const seedance = await estimateFor("apimodels#v1/video/seedance-2.0", {
        prompt: "a cat",
    });
    assertEquals(seedance.evidence, { "720p": 8 });
    assert(near(seedance.credits.default, 1.576));
});

Deno.test("apimodels: the wire body pins the model, forces async on images, and states the defaults", async () => {
    const sent: Json[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_input, init) => {
                sent.push(JSON.parse(String(init?.body)));
                return Promise.resolve(
                    new Response(
                        JSON.stringify({ code: 402, msg: "stop here" }),
                        {
                            status: 402,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    });
    const image = await engine.load(
        await testSealedUnit("apimodels#v1/image/nano-banana-2-1"),
    );
    await image.run({ body: { prompt: "a cat" } });
    const video = await engine.load(
        await testSealedUnit("apimodels#v1/video/seedance-2.0"),
    );
    await video.run({ body: { prompt: "a cat" } });
    assertEquals(sent, [
        {
            prompt: "a cat",
            resolution: "1K",
            model: "nano-banana-2-1",
            async: true,
        },
        {
            prompt: "a cat",
            resolution: "720p",
            duration: 8,
            model: "seedance-2.0",
        },
    ]);
});

Deno.test("apimodels: a failed task settles a provider error with zero usage", async () => {
    const result = await replay(
        "apimodels#v1/image/nano-banana-2-1",
        "synthetic-task-failed",
    );
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as Record<string, unknown>).failCode,
        "UPSTREAM_ERROR",
    );
});

Deno.test("apimodels: a moderation refusal settles 422 with zero usage", async () => {
    const result = await replay(
        "apimodels#v1/image/gpt-image-2",
        "synthetic-task-moderation",
    );
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("apimodels: completed without a result url → synthesized 502, zero usage", async () => {
    const result = await replay(
        "apimodels#v1/image/nano-banana-2-1",
        "synthetic-task-no-result",
    );
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("apimodels: a rejected create is DATA — vendor status, zero usage, no poll", async () => {
    const result = await replay(
        "apimodels#v1/video/veo-3.1-fast-hd",
        "synthetic-submit-rejected",
    );
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as Record<string, unknown>).code, 402);
});

Deno.test("apimodels: a 2xx create with a non-200 envelope code → synthesized 502", async () => {
    const result = await replay(
        "apimodels#v1/image/gemini-3-pro-image",
        "synthetic-submit-envelope-error",
    );
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("apimodels: a failing poll THROWS rather than abandoning a running task", async () => {
    const id = "apimodels#v1/image/nano-banana-2-1";
    const fixture = await loadFixture(
        `${HERE}fixtures/synthetic-poll-failed.json`,
    );
    const unit = await testSealedUnit(id);
    await assertRejects(
        () =>
            runEndpoint({ unit, input: inputFor(id), mode: "replay", fixture }),
        Error,
        "503",
    );
});

Deno.test("apimodels: the input schemas reject before the wire", async () => {
    const rejects = async (id: string, body: Json, why: string) => {
        const unit = await testSealedUnit(id);
        // no fixture: any upstream call fails the test
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    await rejects(
        "apimodels#v1/image/nano-banana-2-1",
        { prompt: "a cat", model: "gpt-image-2" },
        "the model is pinned, not an input",
    );
    await rejects(
        "apimodels#v1/image/nano-banana-2-1",
        { prompt: "a cat", resolution: "8K" },
        "unknown tier",
    );
    await rejects(
        "apimodels#v1/image/gpt-image-2",
        {
            prompt: "a cat",
            image_urls: Array.from(
                { length: 17 },
                (_, i) => `https://example.test/${i}.png`,
            ),
        },
        "more than 16 references",
    );
    await rejects(
        "apimodels#v1/image/gpt-image-2",
        { prompt: "a cat", image_urls: ["data:image/png;base64,AAAA"] },
        "inline base64 refused",
    );
    await rejects(
        "apimodels#v1/video/veo-3.1-fast-hd",
        { prompt: "a cat", aspect_ratio: "1:1" },
        "Veo is 16:9 or 9:16 only",
    );
    await rejects(
        "apimodels#v1/video/seedance-2.0",
        { prompt: "a cat", duration: 20 },
        "Seedance 2.0 tops out at 15 s",
    );
});

Deno.test({
    name:
        "apimodels live: Nano Banana 2.1 renders a 1K image and settles the task's receipt",
    ignore: liveSkip("apimodels"),
    fn: async () => {
        const id = "apimodels#v1/image/nano-banana-2-1";
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        const output = result.output as { resultUrls: string[] };
        assert(output.resultUrls[0]);
        assertEquals(result.usage.evidence, { "1k": 1 });
        assert(result.usage.credits.default > 0);
    },
});

Deno.test({
    name:
        "apimodels live: Veo 3.1 Fast HD renders an 8 s clip and settles the task's receipt",
    ignore: liveSkip("apimodels"),
    fn: async () => {
        const id = "apimodels#v1/video/veo-3.1-fast-hd";
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        const output = result.output as { resultUrls: string[] };
        assert(output.resultUrls[0]);
        assertEquals(result.usage.evidence, { CALL: 1 });
        assert(result.usage.credits.default > 0);
    },
});
