import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
// This is the base64 spelling of "synthetic-image", not a person's image.
// Replay proves the connector/engine contract, not model inference quality.
const syntheticImage = "c3ludGhldGljLWltYWdl";
const vector = Array.from({ length: 128 }, (_, index) => index === 0 ? 1 : 0);
const cases: {
    endpoint: string;
    credits: number;
    microusd: number;
    body: Record<string, Json>;
}[] = [
    {
        endpoint: "represent",
        credits: 1.02,
        microusd: 1020,
        body: { model_name: "Facenet", img: syntheticImage },
    },
    {
        endpoint: "verify",
        credits: 1.8,
        microusd: 1800,
        body: {
            model_name: "Facenet",
            img1: syntheticImage,
            img2: syntheticImage,
        },
    },
    {
        endpoint: "compare",
        credits: 0.044,
        microusd: 44,
        body: {
            model_name: "Facenet",
            source_vector: vector,
            target_vector: vector,
        },
    },
];

Deno.test("deepface catalog publishes exactly the three locked endpoint identities", async () => {
    const bundle = await testBundle();
    const lock = JSON.parse(
        await Deno.readTextFile(new URL("../ids.lock.json", import.meta.url)),
    );
    const expected = [
        "deepface#compare",
        "deepface#represent",
        "deepface#verify",
    ];
    assertEquals(
        Object.keys(bundle.endpoints).filter((id) => id.startsWith("deepface#"))
            .sort(),
        expected,
    );
    assertEquals(
        lock.endpoints.filter((id: string) => id.startsWith("deepface#"))
            .sort(),
        expected,
    );
});

for (const scenario of cases) {
    Deno.test(`deepface#${scenario.endpoint}: fixed estimate and success equal monid_v1 integer ledger rate`, async () => {
        const unit = await testSealedUnit(`deepface#${scenario.endpoint}`);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-${scenario.endpoint}-ok.json`,
        );
        const input = { body: scenario.body };
        const expected = {
            credits: { default: scenario.credits },
            evidence: { CALL: 1 },
        };
        assertEquals(await estimateEndpoint(unit, input), expected);
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, expected);
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals(result.usage.credits.default * 1000, scenario.microusd);
        assertEquals(unit.doc.usage.consolidate, undefined);
        assertEquals(unit.doc.lifecycle?.poll, undefined);
        assertEquals(unit.doc.lifecycle?.stop, undefined);
    });

    Deno.test(`deepface#${scenario.endpoint}: profile/auth/cap/validation/upstream errors bill zero`, async () => {
        const unit = await testSealedUnit(`deepface#${scenario.endpoint}`);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-profile-mismatch.json`,
        );
        for (
            const status of [
                400,
                401,
                402,
                403,
                409,
                413,
                422,
                429,
                500,
                502,
                503,
                504,
            ]
        ) {
            const result = await runEndpoint({
                unit,
                input: { body: scenario.body },
                mode: "replay",
                fixture: {
                    ...fixture,
                    calls: [{
                        ...fixture.calls[0],
                        res: { ...fixture.calls[0].res, status },
                    }],
                },
            });
            assertEquals(result.httpStatus, status);
            assertEquals(result.isProviderError, true);
            assertEquals(result.usage, { credits: {}, evidence: {} });
        }
    });

    Deno.test(`deepface#${scenario.endpoint}: egress carries immutable profile and transport-only credential`, async () => {
        const unit = await testSealedUnit(`deepface#${scenario.endpoint}`);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-${scenario.endpoint}-ok.json`,
        );
        let requests = 0;
        const runId = "11111111-1111-4111-8111-111111111111";
        const loaded = await new Engine({
            transport: directTransport({
                params: async () => ({ apiKey: "synthetic-test-key" }),
                fetch: async (url, init) => {
                    requests++;
                    assertEquals(
                        String(url),
                        `https://api.deepface.dev/${scenario.endpoint}`,
                    );
                    const request = new Request(
                        String(url),
                        init as RequestInit,
                    );
                    const headers = request.headers;
                    assertEquals(
                        headers.get("x-api-key"),
                        "synthetic-test-key",
                    );
                    assertEquals(
                        headers.get("x-deepface-billing-profile"),
                        "monid_v1",
                    );
                    assertEquals(headers.get("x-request-id"), runId);
                    const body = await request.json();
                    assertEquals(body.model_name, "Facenet");
                    assertEquals("apiKey" in body, false);
                    if (scenario.endpoint !== "compare") {
                        assertEquals(body.detector_backend, "opencv");
                        assertEquals(body.enforce_detection, true);
                        assertEquals(body.align, true);
                        assertEquals(body.normalization, "base");
                    }
                    return Response.json(fixture.calls[0].res.body);
                },
            }),
        }).load(unit);
        await loaded.start({ body: scenario.body }, { runId });
        assertEquals(requests, 1);
        await assertRejects(
            () =>
                loaded.start({ body: scenario.body }, { runId: "not-a-uuid" }),
            Error,
            "FN_CONTRACT",
        );
        assertEquals(requests, 1);
    });

    Deno.test(`deepface#${scenario.endpoint}: rejects unsupported models and query/path/body fields before egress`, async () => {
        const unit = await testSealedUnit(`deepface#${scenario.endpoint}`);
        const rejected: RunInput[] = [
            { body: { ...scenario.body, model_name: "VGG-Face" } },
            { body: { ...scenario.body, model_name: "" } },
            { body: { ...scenario.body, async: true } },
            { body: scenario.body, queryParams: { async: true } },
            { body: scenario.body, pathParams: { unsafe: "anything" } },
        ];
        for (const input of rejected) {
            await assertRejects(
                () => runEndpoint({ unit, input, mode: "replay" }),
                Error,
                "INVALID_INPUT",
            );
        }
        for (
            const model of [
                "Facenet",
                "Facenet512",
                "OpenFace",
                "Dlib",
                "SFace",
            ]
        ) {
            assertEquals(
                (await estimateEndpoint(unit, {
                    body: { ...scenario.body, model_name: model },
                })).credits.default,
                scenario.credits,
            );
        }
    });
}

Deno.test("deepface image bindings reject URLs, paths, malformed data and expensive overrides", async () => {
    for (
        const scenario of cases.filter((item) => item.endpoint !== "compare")
    ) {
        const unit = await testSealedUnit(`deepface#${scenario.endpoint}`);
        const field = scenario.endpoint === "verify" ? "img1" : "img";
        const rejected: Record<string, Json>[] = [
            { [field]: "https://example.com/face.jpg" },
            { [field]: "file:///private/face.png" },
            { [field]: "data:text/plain;base64,YQ==" },
            { [field]: "data:image/svg+xml;base64,YQ==" },
            { [field]: "" },
            { [field]: "not valid base64!" },
            { detector_backend: "retinaface" },
            { detector_backend: "skip" },
            { enforce_detection: false },
            { align: false },
            { normalization: "Facenet" },
        ];
        for (const bad of rejected) {
            await assertRejects(
                () =>
                    runEndpoint({
                        unit,
                        input: { body: { ...scenario.body, ...bad } },
                        mode: "replay",
                    }),
                Error,
                "INVALID_INPUT",
            );
        }
        for (
            const prefix of [
                "",
                "data:image/jpeg;base64,",
                "data:image/png;base64,",
                "data:image/webp;base64,",
            ]
        ) {
            await estimateEndpoint(unit, {
                body: { ...scenario.body, [field]: prefix + syntheticImage },
            });
        }
    }
});

Deno.test("deepface image binding handles large base64 without regex stack exhaustion", async () => {
    const unit = await testSealedUnit("deepface#represent");
    await estimateEndpoint(unit, {
        body: { model_name: "Facenet", img: "A".repeat(13_981_016) },
    });
    await assertRejects(
        () =>
            estimateEndpoint(unit, {
                body: { model_name: "Facenet", img: "A".repeat(13_981_051) },
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test("deepface preserves host request identity after an uncertain result without automatic retries", async () => {
    const unit = await testSealedUnit("deepface#compare");
    const seenIds: (string | null)[] = [];
    const loaded = await new Engine({
        transport: directTransport({
            params: async () => ({ apiKey: "synthetic-test-key" }),
            fetch: async (url, init) => {
                const request = new Request(String(url), init as RequestInit);
                seenIds.push(request.headers.get("x-request-id"));
                if (seenIds.length === 1) {
                    throw new Error("synthetic lost response");
                }
                return Response.json({ error: "request_id_conflict" }, {
                    status: 409,
                });
            },
        }),
    }).load(unit);
    const run = { runId: "22222222-2222-4222-8222-222222222222" };
    const input = { body: cases[2].body };
    await assertRejects(
        () => loaded.start(input, run),
        Error,
        "EXECUTION_FAILED",
    );
    assertEquals(seenIds, [run.runId]);
    const duplicate = await loaded.start(input, run);
    assertEquals(seenIds, [run.runId, run.runId]);
    assertEquals(duplicate.kind, "COMPLETED");
    if (duplicate.kind === "COMPLETED") {
        assertEquals(duplicate.httpStatus, 409);
        assertEquals(duplicate.usage, { credits: {}, evidence: {} });
    }
});

Deno.test("deepface#compare excludes image, batch, aliases, empty/oversize/non-numeric vectors", async () => {
    const unit = await testSealedUnit("deepface#compare");
    const body = cases[2].body;
    const rejected: Record<string, Json>[] = [
        { img: syntheticImage },
        { target_vectors: [vector, vector] },
        { vectors: [vector] },
        { vector_b: vector },
        { source_vector: [] },
        { target_vector: [] },
        { target_vector: [vector] },
        { source_vector: Array(513).fill(0) },
        { target_vector: ["1"] },
    ];
    for (const bad of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: { ...body, ...bad } },
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test({
    name:
        "deepface#compare live: activated monid_v1 account, synthetic vectors only",
    ignore: liveSkip("deepface"),
    fn: async () => {
        const unit = await testSealedUnit("deepface#compare");
        const result = await runEndpoint({
            unit,
            input: { body: cases[2].body },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, {
            credits: { default: 0.044 },
            evidence: { CALL: 1 },
        });
    },
});
