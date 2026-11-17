import { assertEquals } from "@std/assert";
import {
    enrichBatchCredits,
    enrichCredits,
    enrichRowCredits,
} from "./enrich-cost.ts";

/**
 * The cost rules behind `voygr#enrich`, one assertion per shape. Every
 * expectation below was read from the live `POST /v1/enrich` answering
 * `estimate_only: true` (free) on 2026-10-27, so a rule that drifts from
 * the API fails here.
 * The body is always one flat place; only the cost-relevant keys are set.
 */

/** [shape, body, credits the live API quoted]. */
const SHAPES: [string, Parameters<typeof enrichRowCredits>[0], number][] = [
    // ---- the standard lane: 1 credit per place however many ----------------
    ["no attributes means the standard set", {}, 1],
    ["three standard attributes", {
        attributes: ["phone", "website", "opening_hours"],
    }, 1],
    ["x, existence and open_closed are standard", {
        attributes: ["x", "existence", "open_closed"],
    }, 1],
    ["socials and email are standard", {
        attributes: ["facebook", "instagram", "tiktok", "email", "x"],
    }, 1],
    ["a standard name as a field spec", { attributes: [{ name: "phone" }] }, 1],
    ["a repeated standard name", { attributes: ["phone", "phone"] }, 1],
    ["standard names fold case", { attributes: ["PHONE", "phone"] }, 1],
    ["a capitalised standard name", { attributes: ["Phone"] }, 1],

    // ---- the research lane: 1 credit per field -----------------------------
    ["one research field", { attributes: ["wheelchair_accessible"] }, 1],
    ["two research fields", {
        attributes: ["wheelchair_accessible", "outdoor_seating"],
    }, 2],
    ["twenty research fields", {
        attributes: Array.from({ length: 20 }, (_, i) => "f" + i),
    }, 20],
    ["a repeated research field", { attributes: ["wifi", "wifi"] }, 1],
    ["research names keep case", { attributes: ["wifi", "WIFI"] }, 2],
    ["research field specs", {
        attributes: [
            { name: "wifi", description: "free wifi?", value_type: "bool" },
            { name: "parking" },
        ],
    }, 2],
    ["a padded name is trimmed for the lane", { attributes: [" owners "] }, 1],

    // ---- mixed -------------------------------------------------------------
    ["standard plus research pays both", {
        attributes: ["phone", "wheelchair_accessible"],
    }, 2],

    // ---- people columns: 2 + one per distinct contact ----------------------
    ["owners", { attributes: ["owners"] }, 2],
    ["owners with phone and email", {
        attributes: [{ name: "owners", include: ["phone", "email"] }],
    }, 4],
    ["owners with all three contacts", {
        attributes: [{
            name: "owners",
            include: ["phone", "email", "linkedin"],
        }],
    }, 5],
    ["owners with an empty include", {
        attributes: [{ name: "owners", include: [] }],
    }, 2],
    ["owners with a repeated contact", {
        attributes: [{ name: "owners", include: ["phone", "phone", "email"] }],
    }, 4],
    ["key_people", { attributes: ["key_people"] }, 2],
    ["key_people with all three contacts", {
        attributes: [{
            name: "key_people",
            include: ["phone", "email", "linkedin"],
        }],
    }, 5],
    ["owners and key_people", { attributes: ["owners", "key_people"] }, 4],
    ["owner_org is an ordinary field", { attributes: ["owner_org"] }, 1],
    ["owners and owner_org", { attributes: ["owners", "owner_org"] }, 3],
    ["standard plus owners", { attributes: ["phone", "owners"] }, 3],
    ["the first of a repeated name wins (bare)", {
        attributes: ["owners", { name: "owners", include: ["phone", "email"] }],
    }, 2],
    ["the first of a repeated name wins (with contacts)", {
        attributes: [{ name: "owners", include: ["phone", "email"] }, "owners"],
    }, 4],

    // ---- checks: name and trading address share one credit -----------------
    ["verify_name", { attributes: ["phone"], verify_name: true }, 2],
    ["verify_address", { attributes: ["phone"], verify_address: true }, 2],
    ["verify_name and verify_address share one lookup", {
        attributes: ["phone"],
        verify_name: true,
        verify_address: true,
    }, 2],
    ["verify_registered_address", {
        attributes: ["phone"],
        verify_registered_address: true,
    }, 2],
    ["all three checks", {
        attributes: ["phone"],
        verify_name: true,
        verify_address: true,
        verify_registered_address: true,
    }, 3],
    ["checks set to false", {
        attributes: ["phone"],
        verify_name: false,
        verify_address: false,
        verify_registered_address: false,
    }, 1],
    ["a check on a research-only request", {
        attributes: ["wheelchair_accessible"],
        verify_name: true,
    }, 2],
    ["research, standard and every check", {
        attributes: ["wheelchair_accessible", "phone"],
        verify_name: true,
        verify_address: true,
        verify_registered_address: true,
    }, 4],

    // ---- flags that cost nothing -------------------------------------------
    ["validate_existence on a standard request", {
        attributes: ["phone"],
        validate_existence: true,
    }, 1],
    ["validate_existence on a research request", {
        attributes: ["wheelchair_accessible"],
        validate_existence: true,
    }, 1],
    ["include_summary", {
        attributes: ["wheelchair_accessible"],
        include_summary: true,
    }, 1],
];

for (const [shape, body, credits] of SHAPES) {
    Deno.test(`enrichRowCredits: ${shape} is ${credits}`, () => {
        assertEquals(enrichRowCredits(body), credits);
    });
}

// ---------------------------------------------------------------------------
// the settle: the request's fold, adjusted by what the answer shows
// ---------------------------------------------------------------------------

const FOUND = { value: { number: "+14155550100" }, confidence: "high" };
const NOT_FOUND = {
    value: null,
    confidence: null,
    abstain_reason: "not_found",
};
const RESEARCHED = { value: true, confidence: "high", status: "confirmed" };
const ABSTAINED = { value: null, confidence: null, abstain_reason: "failed" };
const STATUS = { existence_confidence: 0.99, closure_confidence: 0.01 };
const OPERATIONAL = { status: "open", closure_confidence: 0.01 };
const COMPLETED = { stopped_reason: "completed" };

const settle = (
    body: Parameters<typeof enrichRowCredits>[0],
    output: unknown,
) => enrichCredits({ data: { input: { body }, output } }).counts.CREDIT;

/** [shape, body, answer, credits settled]. Each of these was read live from
 *  `GET /v1/usage` deltas, or follows VOYGR's settle (the agent_unavailable
 *  state cannot be induced on demand). */
const SETTLED: [
    string,
    Parameters<typeof enrichRowCredits>[0],
    unknown,
    number,
][] = [
    ["agent_unavailable, the standard value came back: only that lane bills", {
        attributes: ["phone", "wheelchair_accessible"],
    }, {
        attributes: { phone: FOUND, wheelchair_accessible: ABSTAINED },
        meta: { stopped_reason: "agent_unavailable" },
    }, 1],
    ["agent_unavailable, every standard value null: nothing bills", {
        attributes: ["phone", "wheelchair_accessible"],
    }, {
        attributes: { phone: NOT_FOUND, wheelchair_accessible: ABSTAINED },
        meta: { stopped_reason: "agent_unavailable" },
    }, 0],
    ["agent_unavailable on a research-only request", {
        attributes: ["wheelchair_accessible"],
    }, {
        attributes: { wheelchair_accessible: ABSTAINED },
        meta: { stopped_reason: "agent_unavailable" },
    }, 0],
    ["agent_unavailable counts a people column as 0", {
        attributes: ["phone", "owners"],
    }, {
        attributes: { phone: FOUND, owners: ABSTAINED },
        meta: { stopped_reason: "agent_unavailable" },
    }, 1],
    ["agent_unavailable counts a check as 0", {
        attributes: ["phone", "wheelchair_accessible"],
        verify_name: true,
        verify_registered_address: true,
    }, {
        attributes: { phone: FOUND, wheelchair_accessible: ABSTAINED },
        meta: { stopped_reason: "agent_unavailable" },
    }, 1],
    ["agent_unavailable with status values back: the status lane bills", {
        attributes: ["existence", "wheelchair_accessible"],
    }, {
        attributes: { wheelchair_accessible: ABSTAINED },
        status: STATUS,
        meta: { stopped_reason: "agent_unavailable" },
    }, 1],
    ["mixed, the standard value null: the standard credit drops", {
        attributes: ["phone", "wheelchair_accessible"],
    }, {
        attributes: { phone: NOT_FOUND, wheelchair_accessible: ABSTAINED },
        meta: COMPLETED,
    }, 1],
    [
        "mixed, the standard attribute absent from the answer",
        {
            attributes: ["phone", "wheelchair_accessible"],
        },
        { attributes: { wheelchair_accessible: RESEARCHED }, meta: COMPLETED },
        1,
    ],
    ["mixed, the standard value found: both lanes bill", {
        attributes: ["phone", "wheelchair_accessible"],
    }, {
        attributes: { phone: FOUND, wheelchair_accessible: RESEARCHED },
        meta: COMPLETED,
    }, 2],
    ["mixed, one of two standard values found: the credit stays", {
        attributes: ["phone", "website", "wheelchair_accessible"],
    }, {
        attributes: {
            phone: NOT_FOUND,
            website: { value: { url: "https://example.com" } },
            wheelchair_accessible: RESEARCHED,
        },
        meta: COMPLETED,
    }, 2],
    ["mixed, the standard name sent in capitals", {
        attributes: ["PHONE", "wheelchair_accessible"],
    }, {
        attributes: { phone: FOUND, wheelchair_accessible: RESEARCHED },
        meta: COMPLETED,
    }, 2],
    ["mixed, existence and open_closed come back as status blocks", {
        attributes: ["existence", "open_closed", "wheelchair_accessible"],
    }, {
        attributes: { wheelchair_accessible: ABSTAINED },
        status: STATUS,
        operational_status: OPERATIONAL,
        meta: COMPLETED,
    }, 2],
    ["mixed, only the existence block comes back", {
        attributes: ["existence", "open_closed", "wheelchair_accessible"],
    }, {
        attributes: { wheelchair_accessible: ABSTAINED },
        status: STATUS,
        operational_status: null,
        meta: COMPLETED,
    }, 2],
    ["mixed, only closure_confidence is set: the status lane came back", {
        attributes: ["open_closed", "wheelchair_accessible"],
    }, {
        attributes: { wheelchair_accessible: ABSTAINED },
        status: { existence_confidence: null, closure_confidence: 0.4 },
        meta: COMPLETED,
    }, 2],
    [
        "mixed, existence asked, status block with both confidences null: the credit drops",
        {
            attributes: ["existence", "wheelchair_accessible"],
        },
        {
            attributes: { wheelchair_accessible: ABSTAINED },
            status: { existence_confidence: null, closure_confidence: null },
            meta: COMPLETED,
        },
        1,
    ],
    [
        "mixed, open_closed asked, status confidences null though operational_status is there: the credit drops",
        {
            attributes: ["open_closed", "wheelchair_accessible"],
        },
        {
            attributes: { wheelchair_accessible: ABSTAINED },
            status: { existence_confidence: null, closure_confidence: null },
            operational_status: { status: "unknown" },
            meta: COMPLETED,
        },
        1,
    ],
    [
        "mixed, a null status block but another standard value found: the credit stays",
        {
            attributes: ["existence", "phone", "wheelchair_accessible"],
        },
        {
            attributes: { phone: FOUND, wheelchair_accessible: ABSTAINED },
            status: { existence_confidence: null, closure_confidence: null },
            meta: COMPLETED,
        },
        2,
    ],
    ["mixed, existence asked and no status block: the credit drops", {
        attributes: ["existence", "wheelchair_accessible"],
    }, {
        attributes: { wheelchair_accessible: RESEARCHED },
        status: null,
        meta: COMPLETED,
    }, 1],
    [
        "people column with a null standard value",
        {
            attributes: ["phone", "owners"],
        },
        {
            attributes: { phone: NOT_FOUND, owners: ABSTAINED },
            meta: COMPLETED,
        },
        2,
    ],
    [
        "a check on a standard request, the value null: the credit drops",
        {
            attributes: ["phone"],
            verify_name: true,
        },
        { attributes: { phone: NOT_FOUND }, meta: { estimated_credits: 2 } },
        1,
    ],
    [
        "a check on a standard request, the value found",
        {
            attributes: ["phone"],
            verify_name: true,
        },
        { attributes: { phone: FOUND }, meta: { estimated_credits: 2 } },
        2,
    ],
    [
        "the default set with a check, nothing found",
        {
            verify_registered_address: true,
        },
        { attributes: {}, status: null, operational_status: null },
        1,
    ],
    [
        "the default set with a check, hours found",
        {
            verify_registered_address: true,
        },
        { attributes: { opening_hours: FOUND } },
        2,
    ],
    [
        "standard-only, every value null: still 1",
        {
            attributes: ["phone", "website"],
        },
        { attributes: { phone: NOT_FOUND, website: NOT_FOUND } },
        1,
    ],
    ["standard-only on the default set, nothing back: still 1", {}, {
        attributes: {},
    }, 1],
    [
        "standard-only, status blocks null: still 1",
        {
            attributes: ["existence", "open_closed"],
        },
        { attributes: {}, status: null, operational_status: null },
        1,
    ],
    [
        "research-only, the field abstained: still 1",
        {
            attributes: ["wheelchair_accessible"],
        },
        { attributes: { wheelchair_accessible: ABSTAINED }, meta: COMPLETED },
        1,
    ],
    [
        "a body that is not an object falls back to the request's fold",
        {
            attributes: ["phone", "wheelchair_accessible"],
        },
        "gateway timeout",
        2,
    ],
    [
        "an array body falls back to the request's fold",
        {
            attributes: ["phone", "wheelchair_accessible"],
        },
        [],
        2,
    ],
    [
        "a null body falls back to the request's fold",
        {
            attributes: ["phone", "wheelchair_accessible"],
        },
        null,
        2,
    ],
    [
        "an answer with no attributes object",
        {
            attributes: ["phone", "wheelchair_accessible"],
        },
        { meta: COMPLETED },
        1,
    ],
];

for (const [shape, body, output, credits] of SETTLED) {
    Deno.test(`enrichCredits settle: ${shape} is ${credits}`, () => {
        assertEquals(settle(body, output), credits);
    });
}

Deno.test("enrichCredits: the pre-run estimate (no output) is the maximum", () => {
    // the answer can only lower the bill, never raise it
    const body = { attributes: ["phone", "wheelchair_accessible"] };
    assertEquals(
        enrichCredits({ data: { input: { body } } }).counts.CREDIT,
        2,
    );
});

Deno.test("enrichCredits: the hook counts CREDIT from the input body", () => {
    const body = { attributes: ["phone", "wheelchair_accessible"] };
    assertEquals(enrichCredits({ data: { input: { body } } }), {
        counts: { CREDIT: 2 },
    });
});

Deno.test("enrichCredits: is a closed term (no captures) so it can ride a doc", () => {
    // the compiler rejects any free identifier; running the source in an
    // empty scope is the same test without the compiler
    const src = enrichCredits.toString();
    const run = new Function(`return (${src});`)() as typeof enrichCredits;
    assertEquals(
        run({ data: { input: { body: { attributes: ["owners"] } } } }),
        { counts: { CREDIT: 2 } },
    );
});

// ---------------------------------------------------------------------------
// enrich-batch: the same row price, times the places or the rows that
// succeeded. Its fn holds its own copy of the request-side rules (a closed
// term cannot call enrichRowCredits), so every shape above runs through
// both and they must agree.
// ---------------------------------------------------------------------------

const PLACE = { poi_name: "Tartine Bakery" };

/** One row's price under `options`, as enrich-batch estimates it. */
const batchRow = (options: Parameters<typeof enrichRowCredits>[0]) =>
    enrichBatchCredits({
        data: { input: { body: { ...options, places: [PLACE] } } },
    }).counts.CREDIT;

for (const [shape, body, credits] of SHAPES) {
    Deno.test(`enrichBatchCredits: a row with ${shape} costs ${credits}, as enrichRowCredits`, () => {
        assertEquals(batchRow(body), credits);
        assertEquals(batchRow(body), enrichRowCredits(body));
    });
}

Deno.test("enrichBatchCredits: the estimate is places × the row price", () => {
    const options = { attributes: ["phone", "wheelchair_accessible"] };
    const places = [PLACE, PLACE, PLACE];
    assertEquals(
        enrichBatchCredits({
            data: { input: { body: { ...options, places } } },
        }),
        { counts: { CREDIT: 6 } },
    );
});

Deno.test("enrichBatchCredits: the settle is succeeded rows × the full row price", () => {
    const body = {
        attributes: ["phone", "wheelchair_accessible"],
        verify_name: true,
        places: [PLACE, PLACE, PLACE],
    };
    const settle = (output: unknown) =>
        enrichBatchCredits({ data: { input: { body }, output } }).counts.CREDIT;
    assertEquals(settle({ progress: { succeeded: 2, failed: 1 } }), 6);
    assertEquals(settle({ progress: { succeeded: 0, failed: 3 } }), 0);
    // the answer's per-row refunds are invisible in a job's status, so the
    // fold over the answer that enrichCredits does is not done here
    assertEquals(
        settle({
            progress: { succeeded: 1 },
            meta: { stopped_reason: "agent_unavailable" },
        }),
        3,
    );
    // no count to read: nothing is billed
    for (
        const output of [{}, { progress: null }, null, "gateway timeout", []]
    ) {
        assertEquals(settle(output), 0, JSON.stringify(output));
    }
});

Deno.test("enrichBatchCredits: is a closed term (no captures) so it can ride a doc", () => {
    const src = enrichBatchCredits.toString();
    const run = new Function(`return (${src});`)() as typeof enrichBatchCredits;
    assertEquals(
        run({
            data: {
                input: { body: { attributes: ["owners"], places: [PLACE] } },
                output: { progress: { succeeded: 4 } },
            },
        }),
        { counts: { CREDIT: 8 } },
    );
});
