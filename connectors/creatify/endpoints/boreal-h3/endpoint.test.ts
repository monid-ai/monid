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
const ID = "creatify#boreal-h3";
/** The engine's credits fold is plain float arithmetic — assert the rate,
 *  not the float. */
const CENT = 1e-12;
const PARAMS = { apiId: "test-workspace", apiKey: "test-key" };

const estimateFor = async (body: RunInput["body"]) => {
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve(PARAMS),
            fetch: () => Promise.reject(new Error("estimate must not do IO")),
        }),
    }).load(await testSealedUnit(ID));
    return loaded.estimate({ body });
};

Deno.test("creatify#boreal-h3: a plain render estimates duration × the tier rate", async () => {
    const est = await estimateFor({ prompt: "a kite over the sea" });
    // vendor defaults materialized at the binding: 768p, 10 s
    assertEquals(est.evidence, { "768p_second": 10 });
    assertAlmostEquals(est.credits.default, 1.3, CENT);
});

Deno.test("creatify#boreal-h3: reference video holds the 15 s cap and images beyond five bill", async () => {
    const est = await estimateFor({
        prompt: "the runner from Video 1 wears the shoe from Image 1",
        resolution: "2k",
        duration: 8,
        reference_video_urls: ["https://example.com/run.mp4"],
        reference_image_urls: Array.from(
            { length: 7 },
            (_, i) => `https://example.com/${i}.jpg`,
        ),
    });
    assertEquals(est.evidence, {
        "2k_second": 8,
        "2k_reference_second": 15,
        "reference_image": 2,
    });
    // 8 × 0.53 + 15 × 0.6 + 2 × 0.2
    assertAlmostEquals(est.credits.default, 13.64, CENT);
});

Deno.test("creatify#boreal-h3: a done job settles Creatify's own charge; the fold is the cross-check", async () => {
    const fixture = await loadFixture(
        `${FIXTURES}synthetic-boreal-h3-succeeded.json`,
    );
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { prompt: "a kite over the sea", duration: 5 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the claim: 5 s × 0.13 = 0.65, rounded up to the next half credit
    assertEquals(result.usage.credits, { default: 1 });
    assertEquals(result.usage.evidence, { "768p_second": 5 });
    // the half-credit rounding is not expressible in the rate algebra, so
    // the fold disagrees and rides out as mismatch.derived — by design
    assertAlmostEquals(result.usage.mismatch?.derived.default ?? 0, 0.65, CENT);
    const output = result.output as Record<string, Json>;
    assertEquals(output.status, "done");
    assertEquals(
        output.video_output,
        "https://cdn.creatify.ai/boreal_api/JOB1.mp4",
    );
    // the billing field is absorbed into usage; the raw run record keeps it
    assert(!("credits_used" in output));
});

Deno.test("creatify#boreal-h3: the wire body carries the pinned model and the vendor defaults", async () => {
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
    const result = await loaded.run({ body: { prompt: "a cat" } });
    assertEquals(sent, [{
        prompt: "a cat",
        resolution: "768p",
        aspect_ratio: "auto",
        duration: 10,
        prompt_enhancement: "auto",
        model: "boreal-h3",
    }]);
    // a refused creation is data: provider error, zero usage
    assertEquals(result.httpStatus, 400);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("creatify#boreal-h3: the input schema rejects before the wire", async () => {
    const unit = await testSealedUnit(ID);
    const rejects = async (body: Json, why: string) => {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    await rejects({ prompt: "" }, "empty prompt");
    await rejects({ prompt: "x", duration: 16 }, "duration over 15");
    await rejects({ prompt: "x", duration: 2.5 }, "fractional duration");
    await rejects({ prompt: "x", resolution: "720p" }, "a boreal tier");
    await rejects({ prompt: "x", model: "boreal" }, "model is pinned");
    await rejects(
        { prompt: "x", webhook_url: "https://example.com/hook" },
        "webhook_url is withheld",
    );
    await rejects(
        { prompt: "x", image_url: "data:image/png;base64,AAAA" },
        "data URI",
    );
    await rejects(
        { prompt: "x", reference_image_urls: Array(10).fill("https://a/b") },
        "ten reference images",
    );
});

Deno.test({
    name:
        "creatify#boreal-h3 live: renders a 5 s 768p clip and settles 1 credit",
    ignore: liveSkip("creatify", CREATIFY_KEYS),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    prompt: "A paper kite drifting across a blue sky, " +
                        "soft wind, no people",
                    duration: 5,
                    prompt_enhancement: "none",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { "768p_second": 5 });
        assertEquals(result.usage.credits, { default: 1 });
        const output = result.output as { video_output: string };
        assert(output.video_output.startsWith("https://"));
    },
});
