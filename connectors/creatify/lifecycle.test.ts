import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

/**
 * The ONE job protocol, exercised once: every Creatify endpoint shares
 * the provider lifecycle, and the detail URL is the create URL plus the
 * id, so each shape below is one chain that any of the three docs can
 * replay. The billing suites live beside each endpoint.
 */
const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const IDS = ["creatify#boreal-h3", "creatify#aurora", "creatify#aurora-2"];
const INPUTS: Record<string, RunInput> = {
    "creatify#boreal-h3": {
        body: { prompt: "a kite over the sea", duration: 5 },
    },
    "creatify#aurora": {
        body: {
            audio: "https://example.com/voice.mp3",
            image: "https://example.com/face.png",
        },
    },
    "creatify#aurora-2": {
        body: {
            audio: "https://example.com/voice.mp3",
            image: "https://example.com/face.png",
        },
    },
};

const run = async (id: string, fixture: string, input?: RunInput) =>
    await runEndpoint({
        unit: await testSealedUnit(id),
        input: input ?? INPUTS[id],
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}${fixture}.json`),
    });

Deno.test("creatify: a failed render is a provider error with zero usage, on every endpoint", async () => {
    for (const id of IDS) {
        const result = await run(id, "synthetic-job-failed");
        assertEquals(result.httpStatus, 500, id);
        assertEquals(result.providerHttpStatus, 200, id);
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
        const output = result.output as { failed_reason: string };
        assertEquals(
            output.failed_reason,
            "Generation failed, credits refunded",
        );
    }
});

Deno.test("creatify: a rejected render is a 422 with zero usage", async () => {
    const result = await run("creatify#boreal-h3", "synthetic-job-rejected");
    assertEquals(result.httpStatus, 422);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("creatify: a refused creation never polls and never bills", async () => {
    for (const id of IDS) {
        const result = await run(id, "synthetic-start-rejected");
        assertEquals(result.httpStatus, 400, id);
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
    }
});

Deno.test("creatify: done without a file and without caller-side delivery is a 502", async () => {
    const result = await run("creatify#boreal-h3", "synthetic-job-no-output");
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("creatify: done without a file IS a success when output_upload_url took delivery", async () => {
    const result = await run("creatify#boreal-h3", "synthetic-job-delivered", {
        body: {
            prompt: "a kite over the sea",
            duration: 5,
            output_upload_url:
                "https://bucket.example.com/kite.mp4?X-Amz-Signature=abc",
        },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 1 });
    assertEquals(result.usage.evidence, { "768p_second": 5 });
});

Deno.test("creatify: an unrecognized status keeps polling until the job is done", async () => {
    const result = await run(
        "creatify#boreal-h3",
        "synthetic-job-unknown-status",
    );
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 1 });
});

Deno.test("creatify: interning — the three docs share one lifecycle, one auth and one consolidate", async () => {
    const bundle = await testBundle();
    const docs = IDS.map((id) => bundle.endpoints[id]);
    for (const doc of docs) assert(doc, "every id compiles");
    const [a, b, c] = docs;
    assertEquals(a.lifecycle?.start?.$fn.key, b.lifecycle?.start?.$fn.key);
    assertEquals(a.lifecycle?.start?.$fn.key, c.lifecycle?.start?.$fn.key);
    assertEquals(a.lifecycle?.poll?.$fn.key, b.lifecycle?.poll?.$fn.key);
    assertEquals(a.lifecycle?.poll?.$fn.key, c.lifecycle?.poll?.$fn.key);
    assertEquals(a.auth.inject.$fn.key, b.auth.inject.$fn.key);
    assertEquals(a.usage.consolidate?.$fn.key, c.usage.consolidate?.$fn.key);
    // each doc owns its QUANTITIES fns — different rate cards, different
    // entries (the two toRequest pins are different literals too)
    assert(a.usage.evidence.$fn.key !== b.usage.evidence.$fn.key);
    assert(b.usage.evidence.$fn.key !== c.usage.evidence.$fn.key);
});
