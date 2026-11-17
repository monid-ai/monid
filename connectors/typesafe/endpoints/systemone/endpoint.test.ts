import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

/**
 * typesafe#systemone through the compiled doc. The happy fixture is the
 * monid-services live drill (2026-09-20) verbatim; the 422 is synthetic.
 *
 * Rate under test: $42 per billion input tokens, output tokens free
 * (https://docs.typesafe.ai/models, checked 2026-10-22).
 */

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const fixture = (name: string) => loadFixture(`${FIXTURES}${name}.json`);
const ID = "typesafe#systemone";

Deno.test("typesafe#systemone happy: the live drill bills its 407 input tokens; the answer relays whole", async () => {
    const drill = await fixture("live-systemone-drill");
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: drill.calls[0].req.body as Json },
        mode: "replay",
        fixture: drill,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 407 * 0.000000042 },
        evidence: { TOKEN: 407 },
    });
    // the vendor's token counts stay in the output, as the caller's own
    // receipt, and the three answers arrive whole
    assertEquals(result.output, drill.calls[0].res.body);
});

Deno.test("typesafe#systemone provider error: an unknown model is TypeSafe's 422, zero usage", async () => {
    const unknown = await fixture("synthetic-systemone-unknown-model");
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: unknown.calls[0].req.body as Json },
        mode: "replay",
        fixture: unknown,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("typesafe#systemone schema gate: v1's rejections, each beside a passing near-twin", async () => {
    const unit = await testSealedUnit(ID);
    const levels = (n: number) => Array.from({ length: n }, (_, i) => `L${i}`);
    const options = (n: number) =>
        Object.fromEntries(
            Array.from({ length: n }, (_, i) => [`o${i}`, null]),
        );
    const noul = { type: "noul", instructions: "?" };
    const rejected: [string, Record<string, Json>][] = [
        ["unknown question type", {
            state: "x",
            questions: { q: { type: "essay", instructions: "write" } },
        }],
        ["box question (not exposed)", {
            state: "x",
            questions: { where: { type: "box", instructions: "find" } },
        }],
        ["choice without criteria", {
            state: "x",
            questions: { q: { type: "choice", instructions: "pick" } },
        }],
        ["choice with 0 options", {
            state: "x",
            questions: {
                q: { type: "choice", instructions: "pick", criteria: {} },
            },
        }],
        ["choice with 256 options", {
            state: "x",
            questions: {
                q: {
                    type: "choice",
                    instructions: "pick",
                    criteria: options(256),
                },
            },
        }],
        ["score with 1 level", {
            state: "x",
            questions: {
                q: { type: "score", instructions: "rate", criteria: levels(1) },
            },
        }],
        ["score with 11 levels", {
            state: "x",
            questions: {
                q: {
                    type: "score",
                    instructions: "rate",
                    criteria: levels(11),
                },
            },
        }],
        ["missing instructions", {
            state: "x",
            questions: { q: { type: "noul" } },
        }],
        ["null noul criteria", {
            state: "x",
            questions: { q: { ...noul, criteria: null } },
        }],
        ["empty questions", { state: "x", questions: {} }],
        ["unknown top-level field", {
            state: "x",
            questions: { q: noul },
            temperature: 1,
        }],
        ["assets (not exposed)", {
            state: "x",
            questions: { q: noul },
            assets: { logo: { type: "image", data_base64: "AAAA" } },
        }],
        ["missing state", { questions: { q: noul } }],
    ];
    for (const [why, body] of rejected) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    }
    const accepted: Record<string, Json>[] = [
        // the edges just inside each bound
        {
            state: "x",
            questions: {
                q: { type: "score", instructions: "rate", criteria: levels(2) },
            },
        },
        {
            state: "x",
            questions: {
                q: {
                    type: "score",
                    instructions: "rate",
                    criteria: levels(10),
                },
            },
        },
        {
            state: "x",
            questions: {
                q: {
                    type: "choice",
                    instructions: "pick",
                    criteria: options(1),
                },
            },
        },
        {
            state: "x",
            questions: {
                q: {
                    type: "choice",
                    instructions: "pick",
                    criteria: options(255),
                },
            },
        },
        // one question; noul criteria present but partial; structured
        // state and instructions
        { state: "x", questions: { q: noul } },
        {
            state: { ticket: { subject: "Duplicate charge" } },
            questions: {
                q: {
                    type: "noul",
                    instructions: { question: "Is a refund supported?" },
                    criteria: { true: "refund" },
                },
            },
        },
    ];
    for (const body of accepted) {
        await assertInputAccepted({ unit, input: { body }, mode: "replay" });
    }
});

Deno.test("typesafe#systemone estimate: the body's UTF-8 byte count, a ceiling on the drill's tokens", async () => {
    const unit = await testSealedUnit(ID);
    const drill = await fixture("live-systemone-drill");
    // the drill body is 526 bytes; TypeSafe billed it 407 tokens
    const held = await estimateEndpoint(unit, {
        body: drill.calls[0].req.body as Json,
    });
    assertEquals(held.evidence, { TOKEN: 526 });
    // non-ASCII counts in bytes, not characters: "退款" is 6 UTF-8 bytes;
    // the binding materializes model "jev-latest" before the estimate
    const questions = { q: { type: "noul", instructions: "?" } };
    const cjk = await estimateEndpoint(unit, {
        body: { state: "退款", questions },
    });
    const bytes = new TextEncoder().encode(
        JSON.stringify({ state: "退款", questions, model: "jev-latest" }),
    ).length;
    assertEquals(cjk.evidence, { TOKEN: bytes });
});

Deno.test({
    name: "typesafe#systemone live (gated on TYPESAFE_API_KEY)",
    ignore: liveSkip("typesafe"),
    fn: async () => {
        const drill = await fixture("live-systemone-drill");
        const body = drill.calls[0].req.body as Record<string, Json>;
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, Json>;
        assertEquals(typeof output.model, "string");
        // one answer per question, under the caller's ids, of the asked type
        const questions = body.questions as Record<
            string,
            Record<string, Json>
        >;
        const answers = output.answers as Record<string, Record<string, Json>>;
        assertEquals(
            Object.keys(answers).sort(),
            Object.keys(questions).sort(),
        );
        for (const id of Object.keys(questions)) {
            assertEquals(answers[id].type, questions[id].type, id);
        }
        const usage = output.usage as Record<string, Json>;
        assertEquals(typeof usage.input_tokens, "number");
        assertEquals(Object.keys(result.usage.evidence), ["TOKEN"]);
    },
});
