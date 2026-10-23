import {
    assert,
    assertAlmostEquals,
    assertEquals,
    assertRejects,
} from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";
import { CREATIFY_KEYS } from "../../schema/auth.ts";

const FIXTURES = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "creatify#aurora";
const CENT = 1e-12;
const PARAMS = { apiId: "test-workspace", apiKey: "test-key" };
const INPUT = {
    audio: "https://example.com/voice.mp3",
    image: "https://example.com/face.png",
};

const estimateFor = async (body: RunInput["body"]) => {
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve(PARAMS),
            fetch: () => Promise.reject(new Error("estimate must not do IO")),
        }),
    }).load(await testSealedUnit(ID));
    return loaded.estimate({ body });
};

Deno.test("creatify#aurora: the estimate holds the 5-minute ceiling on the selected tier", async () => {
    const v1 = await estimateFor(INPUT);
    assertEquals(v1.evidence, { "aurora_v1_second": 300 });
    assertAlmostEquals(v1.credits.default, 300, CENT);
    const fast = await estimateFor({
        ...INPUT,
        model_version: "aurora_v1_fast",
    });
    assertEquals(fast.evidence, { "aurora_v1_fast_second": 300 });
    assertAlmostEquals(fast.credits.default, 150, CENT);
});

Deno.test("creatify#aurora: a done job settles the audio's whole seconds; claim and fold agree", async () => {
    const fixture = await loadFixture(
        `${FIXTURES}synthetic-aurora-succeeded.json`,
    );
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: INPUT },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // 12 s × 1 credit = the claim exactly, so no mismatch key settles
    // (zUsage is strict — deep equality proves its absence)
    assertEquals(result.usage, {
        credits: { default: 12 },
        evidence: { "aurora_v1_second": 12 },
    });
    const output = result.output as Record<string, Json>;
    assertEquals(
        output.video_output,
        "https://cdn.creatify.ai/avatarx/JOB1.mp4",
    );
    assert(!("credits_used" in output));
});

Deno.test("creatify#aurora: the wire body carries the vendor defaults", async () => {
    const sent: Json[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve(PARAMS),
            fetch: (_input, init) => {
                sent.push(JSON.parse(String(init?.body)));
                return Promise.resolve(
                    new Response(
                        JSON.stringify(["Aurora API access not enabled."]),
                        {
                            status: 400,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(ID));
    const result = await loaded.run({ body: INPUT });
    assertEquals(sent, [{
        ...INPUT,
        model_version: "aurora_v1",
        prompt_guidance_scale: 1,
    }]);
    assertEquals(result.httpStatus, 400);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("creatify#aurora: the input schema rejects before the wire", async () => {
    const unit = await testSealedUnit(ID);
    const rejects = async (body: Json, why: string) => {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    await rejects({ image: INPUT.image }, "audio is required");
    await rejects(
        { ...INPUT, model_version: "aurora_v2" },
        "2.0 is its own doc",
    );
    await rejects(
        { ...INPUT, resolution: "1080p" },
        "resolution is a 2.0 knob",
    );
    await rejects({ ...INPUT, prompt_guidance_scale: 11 }, "guidance over 10");
    await rejects(
        { ...INPUT, webhook_url: "https://example.com/hook" },
        "webhook_url is withheld",
    );
    await rejects({ ...INPUT, ttl_days: 8 }, "ttl over 7");
});

Deno.test({
    name:
        "creatify#aurora live: renders a short avatar clip (needs CREATIFY_LIVE_AUDIO_URL + CREATIFY_LIVE_IMAGE_URL)",
    ignore: liveSkip("creatify", CREATIFY_KEYS) ||
        !Deno.env.get("CREATIFY_LIVE_AUDIO_URL") ||
        !Deno.env.get("CREATIFY_LIVE_IMAGE_URL"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    audio: Deno.env.get("CREATIFY_LIVE_AUDIO_URL") ?? "",
                    image: Deno.env.get("CREATIFY_LIVE_IMAGE_URL") ?? "",
                    model_version: "aurora_v1_fast",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), [
            "aurora_v1_fast_second",
        ]);
    },
});
