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
const ID = "creatify#aurora-2";
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

Deno.test("creatify#aurora-2: the estimate holds the tier ceiling at the tier rate", async () => {
    const def = await estimateFor(INPUT);
    assertEquals(def.evidence, { "720p_second": 60 });
    assertAlmostEquals(def.credits.default, 42, CENT);
    const twoK = await estimateFor({ ...INPUT, resolution: "2k" });
    assertEquals(twoK.evidence, { "2k_second": 15 });
    assertAlmostEquals(twoK.credits.default, 42, CENT);
    const low = await estimateFor({ ...INPUT, resolution: "480p" });
    assertEquals(low.evidence, { "480p_second": 60 });
    assertAlmostEquals(low.credits.default, 24, CENT);
});

Deno.test("creatify#aurora-2: a done job settles whole seconds on the selected tier", async () => {
    const fixture = await loadFixture(
        `${FIXTURES}synthetic-aurora-2-succeeded.json`,
    );
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { ...INPUT, resolution: "480p" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    // 10 s × 0.4 = the claim exactly: no mismatch key (zUsage is strict)
    assertEquals(result.usage, {
        credits: { default: 4 },
        evidence: { "480p_second": 10 },
    });
    const output = result.output as Record<string, Json>;
    assertEquals(output.model_version, "aurora_v2");
    assert(!("credits_used" in output));
});

Deno.test("creatify#aurora-2: the wire body pins aurora_v2 and the default resolution", async () => {
    const sent: Json[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve(PARAMS),
            fetch: (_input, init) => {
                sent.push(JSON.parse(String(init?.body)));
                return Promise.resolve(
                    new Response(JSON.stringify(["Not enough credits"]), {
                        status: 400,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(ID));
    await loaded.run({ body: INPUT });
    assertEquals(sent, [{
        ...INPUT,
        resolution: "720p",
        model_version: "aurora_v2",
    }]);
});

Deno.test("creatify#aurora-2: the input schema rejects before the wire", async () => {
    const unit = await testSealedUnit(ID);
    const rejects = async (body: Json, why: string) => {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    await rejects({ ...INPUT, resolution: "4k" }, "unknown tier");
    await rejects(
        { ...INPUT, model_version: "aurora_v1" },
        "the version is pinned",
    );
    await rejects(
        { ...INPUT, prompt_guidance_scale: 2 },
        "2.0 ignores guidance, so the field is not offered",
    );
    await rejects(
        { ...INPUT, image: "ftp://example.com/face.png" },
        "not http(s)",
    );
});

Deno.test({
    name:
        "creatify#aurora-2 live: renders a short 480p avatar clip (needs CREATIFY_LIVE_AUDIO_URL + CREATIFY_LIVE_IMAGE_URL)",
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
                    resolution: "480p",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["480p_second"]);
    },
});
