import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

const body: Json = {
    title: "Physics Unit Test 4",
    questions: [
        {
            id: "1",
            prompt: "State Ohm's law.",
            maxMarks: 2,
            expectedAnswer: "V = IR (1); at constant temperature (1)",
        },
        {
            id: "2",
            prompt: "A 12 V battery drives 3 A through a resistor.",
            subQuestions: [
                {
                    id: "a",
                    prompt: "Find the resistance.",
                    maxMarks: 2,
                    expectedAnswer: "4 ohm",
                },
            ],
        },
    ],
    pages: ["https://example.com/sheets/p1.jpg"],
};

Deno.test("proctorai: one endpoint, POST to /api/v1/grade, PER_CALL 0.4 gradings, consolidate reads the receipt", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("proctorai#")
    );
    assertEquals(ids, ["proctorai#grade"]);

    const doc = bundle.endpoints["proctorai#grade"];
    assertEquals(doc.request.method, "POST");
    assertEquals(
        doc.request.url,
        "https://agent.proctorai.io/api/v1/grade",
    );
    assertEquals(doc.usage.model.kind, "PER_CALL");
    assertEquals(doc.usage.consolidate !== undefined, true);
    assertEquals(doc.meta.categories, ["education"]);
});

Deno.test("proctorai#grade happy (synthetic): the vendor receipt settles 0.4; billing is stripped from the output", async () => {
    const unit = await testSealedUnit("proctorai#grade");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-grade-ok.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage.credits, { default: 0.4 });
    assertEquals(result.usage.evidence, { CALL: 1 });

    const output = result.output as Record<string, unknown>;
    // the platform account's balance must never reach the caller
    assertEquals("billing" in output, false);
    assertEquals(output.marks, { earned: 3, max: 4, percentage: 75 });
    const questions = output.questions as Record<string, unknown>[];
    assertEquals(questions.length, 2);
    assertEquals(questions[1].subQuestionId, "a");
    assertEquals(questions[1].label, "Q2(a)");
});

Deno.test("proctorai#grade 402 (synthetic): out of gradings is data, zero usage", async () => {
    const unit = await testSealedUnit("proctorai#grade");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-grade-insufficient-balance.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("proctorai#grade 401 (recorded): bad key is data, zero usage", async () => {
    const unit = await testSealedUnit("proctorai#grade");
    const fixture = await loadFixture(
        `${fixturesDir}unauthorized-grade.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { error: { code: string } }).error.code,
        "invalid_api_key",
    );
});

Deno.test("proctorai#grade: the vendor's bounds are enforced before the wire", async () => {
    const unit = await testSealedUnit("proctorai#grade");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-grade-ok.json`,
    );
    const q = { prompt: "Define inertia.", maxMarks: 2 };
    const rejected: Record<string, Json>[] = [
        {},
        { questions: [] },
        { questions: [{ prompt: "" }] },
        { questions: [{ ...q, maxMarks: 0 }] },
        { questions: [{ ...q, id: "1 2" }] },
        { questions: [{ ...q, options: ["only one"] }] },
        {
            questions: [{
                prompt: "Parts",
                subQuestions: [{ id: "a", prompt: "x" }],
            }],
        },
        {
            questions: [q],
            pages: Array.from(
                { length: 21 },
                (_, i) => `https://example.com/p${i}.jpg`,
            ),
        },
        { questions: [q], pages: [] },
        { questions: [q], instructions: "x".repeat(2001) },
        { questions: [q], bogus: true },
        { questions: [{ ...q, bogus: true }] },
    ];
    for (const b of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: b },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(b),
        );
    }
    // the documented example body is accepted
    const ok = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(ok.isProviderError, false);
});

Deno.test({
    name: "proctorai#grade live (gated on PROCTORAI_API_KEY)",
    ignore: liveSkip("proctorai"),
    fn: async () => {
        const unit = await testSealedUnit("proctorai#grade");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    questions: [{
                        id: "1",
                        prompt: "What is 7 x 8?",
                        maxMarks: 1,
                        expectedAnswer: "56",
                    }],
                    answers: [{ questionId: "1", text: "56" }],
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
        assertEquals(typeof result.usage.credits.default, "number");
        const output = result.output as Record<string, unknown>;
        assertEquals("billing" in output, false);
    },
});
