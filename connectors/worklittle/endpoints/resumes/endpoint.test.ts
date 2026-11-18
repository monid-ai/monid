import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json, RunInput } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const replay = async (id: string, input: RunInput, name?: string) =>
    await runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        ...(name
            ? { fixture: await loadFixture(`${fixturesDir}${name}.json`) }
            : {}),
    });
const rejects = async (id: string, input: RunInput, why: string) =>
    await assertRejects(
        () => replay(id, input),
        Error,
        "INVALID_INPUT",
        why,
    );
import { directTransport, Engine } from "@monid/connector-engine";

const ID = "worklittle#resumes";
const INPUT: RunInput = {
    body: {
        resume_text:
            "Jordan Rivera | jordan@example.com\nProduct Manager, Initech, 2021–now",
        job_id: "synthetic-job-1",
    },
};

Deno.test("worklittle: resume and cover-letter lifecycles intern to one fnTable entry each", async () => {
    const bundle = await testBundle();
    const resume = bundle.endpoints[ID];
    const letter = bundle.endpoints["worklittle#cover-letters"];
    assert(resume.lifecycle?.start !== undefined);
    assertEquals(resume.lifecycle?.start, letter.lifecycle?.start);
    assertEquals(resume.lifecycle?.poll, letter.lifecycle?.poll);
});

Deno.test("worklittle#resumes async (synthetic): 202 -> working -> done settles $0.01, receipt stripped", async () => {
    const result = await replay(ID, INPUT, "synthetic-resume-async");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
    const out = result.output as Record<string, unknown>;
    assertEquals(out.status, "done");
    assertEquals(out.document_type, "resume");
    assert(String(out.pdf_base64).length > 0);
    assertEquals("billing" in out, false);
});

Deno.test("worklittle#resumes: a failed job is a free provider error with its status mapped back", async () => {
    const result = await replay(ID, INPUT, "synthetic-document-failed");
    assertEquals(result.httpStatus, 400);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("worklittle#resumes: a 200 on submit (Idempotency-Key replay) is terminal and bills once", async () => {
    const result = await replay(ID, INPUT, "synthetic-document-replay");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.01 },
        evidence: { CALL: 1 },
    });
});

Deno.test("worklittle#resumes: a 402 submit does not poll or bill", async () => {
    const result = await replay(ID, INPUT, "synthetic-document-rejected");
    assertEquals(result.httpStatus, 402);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as { code: string }).code, "PAYMENT_REQUIRED");
});

Deno.test("worklittle#resumes: a 429 status lookup holds the run open", async () => {
    const result = await replay(ID, INPUT, "synthetic-document-transient");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 0.01 });
});

Deno.test("worklittle#resumes: done without a file is a free 502", async () => {
    const result = await replay(ID, INPUT, "synthetic-document-no-file");
    assertEquals(result.httpStatus, 502);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("worklittle#resumes: submit sends async: true and Idempotency-Key = runId", async () => {
    const sent: Array<{ body: Json; key: string | null }> = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_input, init) => {
                sent.push({
                    body: JSON.parse(String(init?.body)),
                    key: new Headers(init?.headers).get("Idempotency-Key"),
                });
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            error: {
                                code: "PAYMENT_REQUIRED",
                                message: "stop",
                            },
                        }),
                        {
                            status: 402,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(ID));
    await loaded.run(INPUT);
    assertEquals(sent.length, 1);
    assertEquals(sent[0].body, {
        ...(INPUT.body as Record<string, Json>),
        async: true,
    });
    assert(sent[0].key !== null && sent[0].key.length >= 8);
});

Deno.test("worklittle#resumes: the schema rejects before the wire", async () => {
    const bad: Json[] = [
        { async: false },
        { formats: [] },
        { formats: ["png"] },
        { format: "txt" },
        { draft: "yes" },
        { resume_text: 1 },
    ];
    for (const body of bad) await rejects(ID, { body }, JSON.stringify(body));
});
