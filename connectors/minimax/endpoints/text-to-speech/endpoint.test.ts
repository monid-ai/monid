import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";
import { DEFAULT_T2A_MODEL, MINIMAX_HD_MODELS } from "./schema/inputs.ts";

const FIXTURES = fromFileUrl(
    new URL("../../fixtures/", import.meta.url),
);

const ID = "minimax#v1/t2a_v2";

/** The shared blocking chain reports extra_info.usage_characters: 1200. */
const CHAIN_CHARS = 1200;

const speak = async (body: RunInput["body"]) =>
    await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}synthetic-blocking-ok.json`),
    });

/** estimate is PURE — a transport that rejects proves no IO happens. */
const estimateFor = async (body: RunInput["body"]) => {
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not do IO")),
        }),
    }).load(await testSealedUnit(ID));
    return loaded.estimate({ body });
};

/**
 * The engine's credits fold (`creditsOf`) is plain float arithmetic, so a
 * per-character rate lands within ~1e-16 of the exact figure rather than on
 * it (1200 x 0.00006 = 0.07200000000000001). That is far inside the 1e-9
 * the mismatch signal treats as agreement, and hosted settlement converts
 * to the integer micro-dollar canon anyway — so the tests assert the rate,
 * not the float. EVIDENCE is exact and asserted exactly.
 */
const CENT = 1e-12;

Deno.test("minimax#t2a_v2: an hd model routes the count to the hd line", async () => {
    const result = await speak({
        model: "speech-2.8-hd",
        text: "The tide came in slow.",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.evidence, { hd_character: CHAIN_CHARS });
    // 1200 characters x $0.0001 = $0.12
    assertAlmostEquals(result.usage.credits.default, 0.12, CENT);
    // the unselected line is ABSENT, not zero
    assert(!("turbo_character" in result.usage.evidence));
});

Deno.test("minimax#t2a_v2: a turbo model routes the count to the turbo line", async () => {
    const result = await speak({
        model: "speech-2.8-turbo",
        text: "The tide came in slow.",
    });
    assertEquals(result.usage.evidence, { turbo_character: CHAIN_CHARS });
    // 1200 characters x $0.00006 = $0.072
    assertAlmostEquals(result.usage.credits.default, 0.072, CENT);
    assert(!("hd_character" in result.usage.evidence));
});

Deno.test("minimax#t2a_v2: the binding default IS the pricing selector (design D5)", async () => {
    // The constant the schema defaults to and the tier the fns assume must
    // be the same, or a body omitting `model` holds one rate and settles
    // another. Pin both halves.
    const unit = await testSealedUnit(ID);
    const body = unit.doc.input.schema.body as Record<string, unknown>;
    const properties = body.properties as Record<
        string,
        Record<string, unknown>
    >;
    assertEquals(properties.model.default, DEFAULT_T2A_MODEL);
    assert(
        !(MINIMAX_HD_MODELS as readonly string[]).includes(DEFAULT_T2A_MODEL),
        "the default is a turbo model",
    );

    // ...and a body with no `model` settles on the turbo line.
    const result = await speak({ text: "The tide came in slow." });
    assertEquals(result.usage.evidence, { turbo_character: CHAIN_CHARS });
});

Deno.test("minimax#t2a_v2: a missing usage_characters bills 0, never 1", async () => {
    // v1 invariant: an unmeasurable run is not a chargeable one.
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { body: { text: "hello" } },
        mode: "replay",
        fixture: {
            name: "no-usage",
            description:
                "a 200 whose envelope carries no extra_info at all — the " +
                "character basis is unreadable, so nothing is billed",
            calls: [{
                req: { method: "POST", url: unit.doc.request.url },
                res: {
                    status: 200,
                    body: {
                        data: { audio: "https://cdn.minimax.io/a.mp3" },
                        base_resp: { status_code: 0, status_msg: "success" },
                    },
                },
            }],
        },
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: {},
        evidence: { turbo_character: 0 },
    });
});

Deno.test("minimax#t2a_v2: the estimate holds the submitted length on the selected tier", async () => {
    const text = "x".repeat(2500);
    assertEquals(
        (await estimateFor({ model: "speech-02-hd", text })).evidence,
        { hd_character: 2500 },
    );
    assertEquals(
        (await estimateFor({ text })).evidence,
        { turbo_character: 2500 },
    );
});

Deno.test({
    name: "minimax#t2a_v2 live (gated on MINIMAX_API_KEY)",
    ignore: liveSkip("minimax"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    text: "Monid connector live check.",
                    voice_setting: { voice_id: "English_Graceful_Lady" },
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // MiniMax bills its OWN character count, which differs slightly from
        // the submitted length — assert the line settled, not a figure.
        assert(typeof result.usage.evidence.turbo_character === "number");
        assert(result.usage.credits.default > 0);
    },
});
