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
 * THE topaz test suite (fixture strategy v2): every video endpoint posts
 * to the SAME `POST /video/express` and polls the same
 * `GET /video/{id}/status` + `GET /video/{id}`, so seven shared chains in
 * `fixtures/` exercise all twelve.
 *
 * ALL chains are SYNTHETIC: the body shapes are the monid-services
 * 2026-09-16 drill records (adaptors/topaz/provider.test.ts). Replace
 * `synthetic-job-complete` with `deno task record` output once a key is
 * wired here.
 *
 * The happy chain's ledger commits 3 credits, so the SETTLED usage is the
 * same for every endpoint; what differs per endpoint is the ESTIMATE —
 * a LITERAL table below, never re-derived from the doc's own rates.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const chain = (name: string) => loadFixture(`${HERE}fixtures/${name}.json`);

const REQUEST_ID = "01a0a7f9-c9ad-76af-a1e7-6fafd2175069";
const CLIP = "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/" +
    "Big_Buck_Bunny_360_10s_1MB.mp4";
/** A 10-second 30 fps 640x360 clip. */
const SOURCE = {
    video_url: CLIP,
    frame_count: 300,
    frame_rate: 30,
    width: 640,
    height: 360,
};

/** Endpoints that REQUIRE an output size. */
const UPSCALERS = new Set([
    "topaz#video/upscale",
    "topaz#video/fix-artifacts",
    "topaz#video/deinterlace",
    "topaz#video/upscale-animation",
    "topaz#video/recover-faces",
    "topaz#video/upscale-creative",
    "topaz#video/upscale-generative",
]);

/** The test input: the clip, upscaled to 1280x720 where an upscaler. */
const inputFor = (id: string, extra: Record<string, Json> = {}): RunInput => ({
    body: {
        ...SOURCE,
        ...(UPSCALERS.has(id)
            ? { output_width: 1280, output_height: 720 }
            : {}),
        ...extra,
    },
});

/**
 * THE LITERAL ESTIMATE TABLE — credits held for the 300-frame test input
 * on each endpoint's DEFAULT model at the HD tier. Typed by hand from
 * https://developer.topazlabs.com/video-models (2026-10-22): frames per
 * credit 100 (Proteus family, Hyperion), 518 (Nyx, Themis, Colorization),
 * 10 (Astra 2), 26.0417 (Starlight); frame interpolation bills new
 * frames only, so a 1x/same-fps request holds the 1-credit floor. A new
 * endpoint MUST add a row (the key-set assertion below).
 */
const DEFAULT_ESTIMATE: Record<string, number> = {
    "topaz#video/upscale": 3,
    "topaz#video/fix-artifacts": 3,
    "topaz#video/deinterlace": 3,
    "topaz#video/upscale-animation": 3,
    "topaz#video/recover-faces": 3,
    "topaz#video/denoise": 1,
    "topaz#video/deblur": 1,
    "topaz#video/colorize": 1,
    "topaz#video/upscale-creative": 30,
    "topaz#video/upscale-generative": 12,
    "topaz#video/frame-interpolation": 1,
    "topaz#video/sdr-to-hdr": 3,
};

const endpointIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("topaz#"))
        .sort();
};

/** Captured upstream calls, answered from `answers` in order. */
function engineWith(answers: { status: number; body?: Json }[]) {
    const calls: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: Record<string, Json>;
    }[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (input, init) => {
                // the engine always passes a plain init object
                const req = (init ?? {}) as {
                    method?: string;
                    headers?: Record<string, string>;
                    body?: unknown;
                };
                calls.push({
                    url: String(input),
                    method: req.method ?? "GET",
                    headers: req.headers ?? {},
                    ...(typeof req.body === "string"
                        ? { body: JSON.parse(req.body) }
                        : {}),
                });
                const next = answers.shift();
                if (next === undefined) {
                    return Promise.reject(new Error("unexpected call"));
                }
                return Promise.resolve(
                    new Response(
                        next.body === undefined
                            ? null
                            : JSON.stringify(next.body),
                        {
                            status: next.status,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    });
    return { engine, calls };
}

/** What `start` sends upstream for this input. */
async function expressBody(id: string, input: RunInput) {
    const { engine, calls } = engineWith([
        { status: 200, body: { requestId: REQUEST_ID } },
    ]);
    const loaded = await engine.load(await testSealedUnit(id));
    const started = await loaded.start(input);
    assertEquals(started.kind, "RUNNING", id);
    assertEquals(calls.length, 1, id);
    assertEquals(calls[0].method, "POST", id);
    assertEquals(calls[0].url, "https://api.topazlabs.com/video/express", id);
    return calls[0].body!;
}

/** Estimates are PURE — a transport that rejects proves no IO happens. */
async function estimateFor(id: string, input: RunInput) {
    const { engine } = engineWith([]);
    const loaded = await engine.load(await testSealedUnit(id));
    return loaded.estimate(input);
}

Deno.test("topaz: the literal estimate table names exactly the twelve endpoints", async () => {
    assertEquals(Object.keys(DEFAULT_ESTIMATE).sort(), await endpointIds());
});

Deno.test("topaz: every endpoint completes the happy chain and settles the committed credits", async () => {
    const fixture = await chain("synthetic-job-complete");
    for (const id of await endpointIds()) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        // the ledger's commit row is both the evidence and the vendor's
        // claim, so they agree and no mismatch rides out (zUsage is strict)
        assertEquals(result.usage, {
            credits: { default: 3 },
            evidence: { "CREDIT": 3 },
        }, id);
        const output = result.output as Record<string, Json>;
        // the caller's link survives…
        const destination = output.destination as Record<string, Json>;
        assertEquals(
            (destination.download as Record<string, Json>).url,
            `https://videocloud.example.test/output/${REQUEST_ID}.mp4`,
            id,
        );
        assertEquals(destination.frameCount, 300, id);
        // …while the ledger and the account fields are stripped from the
        // payload (monid-services VIDEO_INTERNAL_FIELDS)
        for (
            const field of [
                "transactions",
                "userId",
                "adminId",
                "processing",
                "overrides",
                "version",
                "lastEventTs",
            ]
        ) {
            assert(!(field in output), `${id}: ${field} stripped`);
        }
        const source = output.source as Record<string, Json>;
        // Topaz's copy of the caller's own source stays, as in v1
        assertEquals(
            (source.download as Record<string, Json>).url,
            `https://videocloud.example.test/source/${REQUEST_ID}.mp4`,
            id,
        );
        assertEquals(source.frameCount, 300, id);
        assertEquals(output.status, "complete", id);
        // one queued status tick + the complete one
        assertEquals(result.timing.attempts, 2, id);
    }
});

Deno.test("topaz: an empty commit ledger falls back to Topaz's own estimate, with no claim", async () => {
    const id = "topaz#video/upscale";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture: await chain("synthetic-job-complete-no-ledger"),
    });
    assertEquals(result.httpStatus, 200);
    // estimates.cost[0] = 3 is the evidence; no commit row, so the derived
    // fold settles
    assertEquals(result.usage, {
        credits: { default: 3 },
        evidence: { "CREDIT": 3 },
    });
});

Deno.test("topaz: a failed job → synthesized 500, zero usage, the status body as data", async () => {
    const id = "topaz#video/upscale-generative";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture: await chain("synthetic-job-failed"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 500); // OURS — the JOB failed
    assertEquals(result.providerHttpStatus, 200); // THEIRS — the GET was fine
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Json>;
    assertEquals(output.status, "failed");
    assertEquals(output.errorCode, "PROCESSING_FAILURE");
});

Deno.test("topaz: complete with no download link → synthesized 502, zero usage", async () => {
    const id = "topaz#video/denoise";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture: await chain("synthetic-job-complete-no-download"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    // the record DOES carry a commit row: the zero-bill comes from the
    // error path, not from a missing meter
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("topaz: a rejected express is DATA — vendor status, zero usage, body verbatim", async () => {
    const id = "topaz#video/deinterlace";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture: await chain("synthetic-express-rejected"),
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.httpStatus, 400);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Json>;
    assertEquals(output.errorCode, "INVALID_INPUT");
});

Deno.test("topaz: a 2xx express with no requestId THROWS — nothing to poll", async () => {
    const id = "topaz#video/colorize";
    const unit = await testSealedUnit(id);
    const fixture = await chain("synthetic-express-no-request-id");
    await assertRejects(
        () =>
            runEndpoint({ unit, input: inputFor(id), mode: "replay", fixture }),
        Error,
        "no requestId",
    );
});

Deno.test("topaz: a failing status read THROWS rather than abandoning a billing job", async () => {
    const id = "topaz#video/upscale";
    const unit = await testSealedUnit(id);
    const fixture = await chain("synthetic-status-unavailable");
    await assertRejects(
        () =>
            runEndpoint({ unit, input: inputFor(id), mode: "replay", fixture }),
        Error,
        "503",
    );
});

Deno.test("topaz: stop cancels upstream — a confirmed cancel settles nothing, a refused one is UNRESOLVED", async () => {
    const id = "topaz#video/upscale-creative";
    for (
        const [status, kind] of [[204, "STOPPED_UNSETTLED"], [
            409,
            "UNRESOLVED",
        ]] as const
    ) {
        const { engine, calls } = engineWith([
            { status: 200, body: { requestId: REQUEST_ID } },
            { status, ...(status === 204 ? {} : { body: { message: "no" } }) },
        ]);
        const loaded = await engine.load(await testSealedUnit(id));
        const started = await loaded.start(inputFor(id));
        assert(started.kind === "RUNNING");
        const stopped = await loaded.stop(inputFor(id), started.state);
        assertEquals(stopped.kind, kind, `cancel answered ${status}`);
        assertEquals(calls[1].method, "DELETE");
        assertEquals(
            calls[1].url,
            `https://api.topazlabs.com/video/${REQUEST_ID}`,
        );
    }
});

Deno.test("topaz: the express body — source, one filter with the defaults, explicit output", async () => {
    const body = await expressBody(
        "topaz#video/upscale",
        inputFor("topaz#video/upscale"),
    );
    assertEquals(body, {
        source: {
            container: "mp4",
            frameCount: 300,
            frameRate: 30,
            resolution: { width: 640, height: 360 },
            external: { provider: "s3", presignedUrl: CLIP },
        },
        filters: [{ model: "prob-4" }],
        output: {
            resolution: { width: 1280, height: 720 },
            frameRate: 30,
            audioTransfer: "Copy",
            audioCodec: "AAC",
            videoEncoder: "H264",
            videoProfile: "High",
            container: "mp4",
            dynamicCompressionLevel: "High",
        },
    });
});

Deno.test("topaz: per-endpoint knobs land on the filter; same-size endpoints keep the source size", async () => {
    // Astra: the creative dials default, the prompt rides only when given
    const astra = await expressBody(
        "topaz#video/upscale-creative",
        inputFor("topaz#video/upscale-creative", {
            creativity: 0.8,
            prompt: "a fluffy rabbit",
        }),
    );
    assertEquals(astra.filters, [{
        model: "ast-2",
        creativity: 0.8,
        realism: 0,
        sharp: 0.5,
        prompt: "a fluffy rabbit",
    }]);
    // Starlight: sharpness only on slp-2.6
    const precise = await expressBody(
        "topaz#video/upscale-generative",
        inputFor("topaz#video/upscale-generative", { sharpness: 3 }),
    );
    assertEquals(precise.filters, [{ model: "slp-2.6", sharpness: 3 }]);
    const mini = await expressBody(
        "topaz#video/upscale-generative",
        inputFor("topaz#video/upscale-generative", {
            model: "slm-1",
            sharpness: 3,
        }),
    );
    assertEquals(mini.filters, [{ model: "slm-1" }]);
    // Hyperion: H265 Main10, transfer function only on hyp-1
    const hdr = await expressBody(
        "topaz#video/sdr-to-hdr",
        inputFor("topaz#video/sdr-to-hdr", { transfer_function: "pq" }),
    );
    assertEquals(hdr.filters, [{ model: "hyp-1", transferFunction: "pq" }]);
    const output = hdr.output as Record<string, Json>;
    assertEquals(output.videoEncoder, "H265");
    assertEquals(output.videoProfile, "Main10");
    assertEquals(output.resolution, { width: 640, height: 360 });
    const hdr2 = await expressBody(
        "topaz#video/sdr-to-hdr",
        inputFor("topaz#video/sdr-to-hdr", { model: "hyp-2" }),
    );
    assertEquals(hdr2.filters, [{ model: "hyp-2" }]);
    // Frame interpolation: the target fps drives the filter AND the output
    const slowmo = await expressBody(
        "topaz#video/frame-interpolation",
        inputFor("topaz#video/frame-interpolation", { slowmo: 2, fps: 60 }),
    );
    assertEquals(slowmo.filters, [{
        model: "apo-8",
        slowmo: 2,
        fps: 60,
        duplicate: false,
    }]);
    assertEquals((slowmo.output as Record<string, Json>).frameRate, 60);
    // keep_audio false drops the codec; the container follows the URL's
    // extension, case-folded, query ignored
    const silent = await expressBody(
        "topaz#video/deblur",
        inputFor("topaz#video/deblur", {
            keep_audio: false,
            video_url: "https://cdn.example.test/clips/Take.MOV?sig=abc",
        }),
    );
    assertEquals(silent.filters, [{ model: "thm-2" }]);
    assertEquals((silent.source as Record<string, Json>).container, "mov");
    const silentOut = silent.output as Record<string, Json>;
    assertEquals(silentOut.audioTransfer, "None");
    assert(!("audioCodec" in silentOut));
});

Deno.test("topaz: every default estimate matches the literal table", async () => {
    for (const id of await endpointIds()) {
        assertEquals(
            await estimateFor(id, inputFor(id)),
            {
                credits: { default: DEFAULT_ESTIMATE[id] },
                evidence: { "CREDIT": DEFAULT_ESTIMATE[id] },
            },
            id,
        );
    }
});

Deno.test("topaz: the estimate follows the model and the 4K tier", async () => {
    // [endpoint, input extras, credits] — literal, from the rate page
    const rows: [string, Record<string, Json>, number][] = [
        // 4K: Proteus 50 frames per credit → 300 / 50
        [
            "topaz#video/upscale",
            { output_width: 3840, output_height: 2160 },
            6,
        ],
        // portrait 1080x1920 is still the HD tier (it fits 1920x1080 turned)
        [
            "topaz#video/upscale",
            { output_width: 1080, output_height: 1920 },
            3,
        ],
        // …but 1440x1440 outgrows 1080 on the short side
        [
            "topaz#video/upscale",
            { output_width: 1440, output_height: 1440 },
            6,
        ],
        // Gaia 2 is half price: 300 / 300
        ["topaz#video/upscale-animation", { model: "ganim-1" }, 1],
        // Nyx Fast at HD: 300 / 200 = 1.5 → 2
        ["topaz#video/denoise", { model: "nxf-1" }, 2],
        // Astra at 4K: 300 / 6
        [
            "topaz#video/upscale-creative",
            { output_width: 3840, output_height: 2160 },
            50,
        ],
        // Starlight Fast at 4K: 300 / 23.8357 = 12.6 → 13
        [
            "topaz#video/upscale-generative",
            { model: "slf-2", output_width: 3840, output_height: 2160 },
            13,
        ],
        // Hyperion 2: 300 / 13 = 23.1 → 24
        ["topaz#video/sdr-to-hdr", { model: "hyp-2" }, 24],
        // 4x slow motion at 1080p: 900 new frames × 2.07 MP = 1.87 GP;
        // 2 credits per GP on Apollo, 1 on Chronos Fast
        [
            "topaz#video/frame-interpolation",
            { slowmo: 4, output_width: 1920, output_height: 1080 },
            4,
        ],
        [
            "topaz#video/frame-interpolation",
            {
                model: "chf-3",
                slowmo: 4,
                output_width: 1920,
                output_height: 1080,
            },
            2,
        ],
    ];
    for (const [id, extra, credits] of rows) {
        assertEquals(
            await estimateFor(id, inputFor(id, extra)),
            { credits: { default: credits }, evidence: { "CREDIT": credits } },
            `${id} ${JSON.stringify(extra)}`,
        );
    }
});

Deno.test("topaz: the input schema rejects before the wire", async () => {
    const rejects = async (id: string, body: Json, why: string) => {
        await assertRejects(
            () => estimateFor(id, { body }),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    const accepts = async (id: string, body: Json, why: string) => {
        const usage = await estimateFor(id, { body });
        assert(usage.credits.default > 0, why);
    };
    const up = "topaz#video/upscale";
    const upBody = inputFor(up).body as Record<string, Json>;
    // `.strict()` survives compilation and `.extend()`
    await rejects(up, { ...upBody, bogus: 1 }, "unknown key");
    // upscalers REQUIRE the output size; the same-size endpoints do not
    const { output_width: _w, output_height: _h, ...noSize } = upBody;
    await rejects(up, noSize, "upscale without an output size");
    await accepts("topaz#video/denoise", SOURCE, "denoise without a size");
    // the URL must be https:// and end with a video extension — any case
    await rejects(up, { ...upBody, video_url: "http://a.test/x.mp4" }, "http");
    await rejects(
        up,
        { ...upBody, video_url: "https://sfs.example.test/AbC?e=1" },
        "extension-less URL",
    );
    await rejects(
        up,
        { ...upBody, video_url: "https://a.test/x.gif" },
        "not a video extension",
    );
    await accepts(
        up,
        { ...upBody, video_url: "HTTPS://a.test/Take.MP4?sig=1#t=2" },
        "upper-case scheme and extension, query and fragment",
    );
    // the hosted relay rule: no private, loopback, link-local or internal
    // host, in any spelling a URL parser would normalize into one
    for (
        const host of [
            "localhost",
            "LOCALHOST:8080",
            "cdn.localhost",
            "metadata.google.internal",
            "[::1]",
            "127.0.0.1",
            "0.0.0.0",
            "10.1.2.3",
            "172.16.0.1",
            "172.31.255.255",
            "192.168.1.1",
            "169.254.169.254",
            "2130706433",
            "0x7f.1",
            "0177.0.0.1",
            "user@127.0.0.1",
            // spellings a URL parser normalizes into a blocked host: a
            // trailing dot, a backslash, percent-encoding, full-width digits
            "127.0.0.1.",
            "10.0.0.1.:443",
            "2130706433.",
            "localhost.",
            "127.0.0.1\\",
            "%31%32%37.0.0.1",
            "\uFF11\uFF12\uFF17.0.0.1",
            "evil.test\\@127.0.0.1",
        ]
    ) {
        await rejects(
            up,
            { ...upBody, video_url: `https://${host}/clip.mp4` },
            `blocked host ${host}`,
        );
    }
    for (
        const host of [
            "172.32.0.1",
            "8.8.8.8",
            "10.example.test",
            "cdn.example.test:8443",
            "127.0.0.1@cdn.example.test",
            "8.8.8.8.",
            "xn--bcher-kva.example",
        ]
    ) {
        await accepts(
            up,
            { ...upBody, video_url: `https://${host}/clip.mp4` },
            `public host ${host}`,
        );
    }
    // models are per endpoint: a Starlight id is not a Proteus model
    await rejects(up, { ...upBody, model: "slp-2.6" }, "foreign model");
    await accepts(up, { ...upBody, model: "rhea-1" }, "own model");
    // single-model endpoints take no `model` at all
    await rejects(
        "topaz#video/deblur",
        { ...SOURCE, model: "thm-2" },
        "model on a single-model endpoint",
    );
    // knob ranges
    const gen = "topaz#video/upscale-generative";
    const genBody = inputFor(gen).body as Record<string, Json>;
    await rejects(gen, { ...genBody, sharpness: 6 }, "sharpness over 5");
    await accepts(gen, { ...genBody, sharpness: 5 }, "sharpness at 5");
    await rejects(
        "topaz#video/frame-interpolation",
        { ...SOURCE, slowmo: 17 },
        "slowmo over 16",
    );
    await accepts(
        "topaz#video/frame-interpolation",
        { ...SOURCE, slowmo: 16 },
        "slowmo at 16",
    );
    await rejects(
        "topaz#video/sdr-to-hdr",
        { ...SOURCE, transfer_function: "sdr" },
        "unknown transfer function",
    );
    const astra = "topaz#video/upscale-creative";
    const astraBody = inputFor(astra).body as Record<string, Json>;
    await rejects(astra, { ...astraBody, creativity: 1.5 }, "creativity > 1");
    await rejects(
        astra,
        { ...astraBody, prompt: "x".repeat(1001) },
        "prompt over 1000 chars",
    );
    await accepts(
        astra,
        { ...astraBody, prompt: "x".repeat(1000) },
        "prompt at 1000 chars",
    );
});

Deno.test("topaz: fn provenance — one lifecycle and one consolidate for all twelve", async () => {
    const bundle = await testBundle();
    const ids = await endpointIds();
    const first = bundle.endpoints[ids[0]];
    const start = first.lifecycle?.start?.$fn.key;
    const poll = first.lifecycle?.poll?.$fn.key;
    const stop = first.lifecycle?.stop?.$fn.key;
    const consolidate = first.usage.consolidate?.$fn.key;
    assert(start && poll && stop && consolidate);
    assertEquals(
        bundle.fnTable[start].provenance,
        "connectors/topaz/provider.ts#lifecycle.start",
    );
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.lifecycle?.start?.$fn.key, start, id);
        assertEquals(doc.lifecycle?.poll?.$fn.key, poll, id);
        assertEquals(doc.lifecycle?.stop?.$fn.key, stop, id);
        assertEquals(doc.usage.consolidate?.$fn.key, consolidate, id);
        assertEquals(doc.timeouts.runMs, 1_800_000, id);
    }
});

/**
 * LIVE — real money: Topaz bills credits on every completed job, and
 * diffusion models can queue upstream for most of the 30-minute budget.
 * Opt in with `TOPAZ_LIVE_SPEND=1` on top of the credential.
 */
Deno.test({
    name:
        "topaz#video/upscale live: upscales a real clip and settles the committed credits",
    ignore: liveSkip("topaz") || Deno.env.get("TOPAZ_LIVE_SPEND") !== "1",
    fn: async () => {
        const id = "topaz#video/upscale";
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        const output = result.output as Record<string, Json>;
        const destination = output.destination as Record<string, Json>;
        assert((destination.download as Record<string, Json>).url);
        assert(!("transactions" in output), "the ledger is stripped");
        // the 640x360 → 1280x720 drill committed 3 credits (2026-09-16)
        assert(result.usage.credits.default > 0);
    },
});
