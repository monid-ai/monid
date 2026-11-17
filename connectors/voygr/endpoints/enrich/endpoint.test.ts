import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, type OwnedResource, RunKind } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    assertInputAccepted,
    fixtureReader,
    liveSkip,
    loadEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { harness } from "../../test-support.ts";

/**
 * `voygr#enrich`. The fixtures are real answers from api.voygr.tech
 * (2026-10-27), trimmed and header-free; the 8 `estimate_only` shapes below
 * were quoted live too. Sub-account ids are made up.
 */

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "voygr#enrich";
const h = harness(ID, import.meta.url);
const SUB_ID = "sub_00000000000000000000000000000001";
const OWNED: OwnedResource = {
    resource: "voygr/sub-account",
    externalId: SUB_ID,
    data: { reference: "monid:ws-1" },
};

const PLACE = {
    poi_name: "Tartine Bakery",
    address: "600 Guerrero St, San Francisco, CA 94110",
    country: "US",
};

async function run(fixture: string, body: Json) {
    return await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${FIXTURES}${fixture}.json`),
        resources: [OWNED],
        scopeKey: "ws-1",
    });
}

/** The pre-run estimate: pure, so no fixture (a call would fail the test).
 *  The endpoint is bound, so it loads with a reader (as saperly's tests do). */
async function estimate(body: Json) {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay",
        resources: [OWNED],
        scopeKey: "ws-1",
    });
    return loaded.estimate({ body });
}

async function fixtureBody(fixture: string): Promise<Json> {
    return (await loadFixture(`${FIXTURES}${fixture}.json`)).calls[0].res.body;
}

// ---------------------------------------------------------------------------
// estimate: pinned to the live estimate_only answers
// ---------------------------------------------------------------------------

/** The 8 shapes asked live with `estimate_only: true` (Blue Bottle Coffee,
 *  66 Mint St), and the `meta.estimated_credits` the API quoted. */
const LIVE: [string, Json, number][] = [
    ["standard only", { attributes: ["phone", "website", "opening_hours"] }, 1],
    ["research x1", { attributes: ["wheelchair_accessible"] }, 1],
    ["research x2", {
        attributes: ["wheelchair_accessible", "outdoor_seating"],
    }, 2],
    ["mixed", { attributes: ["phone", "wheelchair_accessible"] }, 2],
    ["owners", { attributes: ["owners"] }, 2],
    ["owners with phone and email", {
        attributes: [{ name: "owners", include: ["phone", "email"] }],
    }, 4],
    ["verify_name and verify_address", {
        attributes: ["phone"],
        verify_name: true,
        verify_address: true,
    }, 2],
    ["verify_registered_address", {
        attributes: ["phone"],
        verify_registered_address: true,
        registered_address: "66 Mint St, San Francisco, CA 94103",
    }, 2],
];

Deno.test("enrich estimate table matches the live estimate_only answers", async () => {
    for (const [shape, extra, credits] of LIVE) {
        const body = {
            poi_name: "Blue Bottle Coffee",
            address: "66 Mint St, San Francisco, CA 94103",
            country: "US",
            ...(extra as Record<string, Json>),
        };
        const quoted = await estimate(body);
        assertEquals(
            quoted.credits,
            { default: credits },
            `${shape}: live estimate was ${credits}`,
        );
        assertEquals(quoted.evidence, { CREDIT: credits }, shape);
    }
});

Deno.test("enrich estimate: no attributes is one standard credit", async () => {
    assertEquals((await estimate(PLACE)).credits, { default: 1 });
});

// ---------------------------------------------------------------------------
// settle: the derived fold
// ---------------------------------------------------------------------------

Deno.test("enrich happy settles the derived fold", async () => {
    const cases: [string, Json, number][] = [
        ["happy-standard", {
            ...PLACE,
            attributes: ["phone", "website", "opening_hours"],
        }, 1],
        ["happy-research", {
            ...PLACE,
            attributes: ["wheelchair_accessible"],
        }, 1],
        ["happy-mixed", {
            ...PLACE,
            attributes: ["phone", "wheelchair_accessible"],
        }, 2],
    ];
    for (const [fixture, body, credits] of cases) {
        const result = await run(fixture, body);
        assertEquals(result.httpStatus, 200, fixture);
        assertEquals(result.isProviderError, false, fixture);
        assertEquals(
            result.usage,
            { credits: { default: credits }, evidence: { CREDIT: credits } },
            fixture,
        );
        assertEquals(result.output, await fixtureBody(fixture), fixture);
        // what the run bills is exactly what the estimate promised
        assertEquals(
            (await estimate(body)).credits,
            result.usage.credits,
            fixture,
        );
    }
});

Deno.test("enrich 402 and 422 settle at zero and pass the body through", async () => {
    const refused: [string, number, Json][] = [
        ["payment-required", 402, {
            ...PLACE,
            attributes: ["phone", "wheelchair_accessible"],
            max_credits: 1,
        }],
        ["unprocessable", 422, {
            poi_name: "Tartine Bakery",
            latitude: 0,
            longitude: 0,
            attributes: ["phone"],
        }],
    ];
    for (const [fixture, status, body] of refused) {
        const result = await run(fixture, body);
        assertEquals(result.httpStatus, status, fixture);
        assertEquals(result.isProviderError, true, fixture);
        assertEquals(result.usage, { credits: {}, evidence: {} }, fixture);
        assertEquals(result.output, await fixtureBody(fixture), fixture);
    }
});

// ---------------------------------------------------------------------------
// settle: the answer can lower the request's fold, never raise it
// ---------------------------------------------------------------------------

const NOWHERE = {
    poi_name: "Zzyzx Qwertyuiop Emporium",
    address: "1 Nowhere Rd, Fakeville, ZZ 00000",
    country: "US",
};

/** Run a recorded chain and assert what it settled, against the estimate. */
async function settles(
    fixture: string,
    body: Json,
    credits: number,
    estimated: number,
) {
    const result = await run(fixture, body);
    assertEquals(result.httpStatus, 200, fixture);
    assertEquals(result.isProviderError, false, fixture);
    assertEquals(result.usage.evidence, { CREDIT: credits }, fixture);
    assertEquals(
        result.usage.credits,
        credits === 0 ? {} : { default: credits },
        fixture,
    );
    assertEquals(result.output, await fixtureBody(fixture), fixture);
    assertEquals((await estimate(body)).credits, { default: estimated });
}

Deno.test("evidence: agent_unavailable bills only the standard lane", async () => {
    // synthetic. The research runtime is down: the research field abstains,
    // the standard lane still runs. The standard value came back: 1.
    await settles(
        "synthetic-agent-unavailable",
        {
            ...PLACE,
            attributes: ["phone", "wheelchair_accessible"],
        },
        1,
        2,
    );
    // every standard value null as well: nothing left to bill
    await settles(
        "synthetic-agent-unavailable-standard-null",
        {
            ...PLACE,
            attributes: ["phone", "wheelchair_accessible"],
        },
        0,
        2,
    );
});

Deno.test("evidence: mixed request with all standard values null drops the standard credit", async () => {
    // recorded: GET /v1/usage moved by 1, the estimate said 2
    await settles(
        "mixed-standard-not-found",
        {
            ...NOWHERE,
            attributes: ["phone", "wheelchair_accessible"],
        },
        1,
        2,
    );
});

Deno.test("evidence: standard-only request with all values null still bills 1", async () => {
    // recorded: GET /v1/usage moved by 1
    await settles(
        "standard-not-found",
        {
            ...NOWHERE,
            attributes: ["phone", "website"],
        },
        1,
        1,
    );
});

Deno.test("evidence: a check on a standard request with the value null drops the standard credit", async () => {
    // recorded: GET /v1/usage moved by 1 (the check), the estimate said 2
    await settles(
        "verify-standard-not-found",
        {
            ...NOWHERE,
            attributes: ["phone"],
            verify_name: true,
        },
        1,
        2,
    );
});

Deno.test("evidence: existence and open_closed come back as status blocks and keep the standard credit", async () => {
    // recorded: neither is under `attributes`, yet GET /v1/usage moved by 2
    await settles(
        "mixed-status-blocks",
        {
            ...NOWHERE,
            attributes: ["existence", "open_closed", "wheelchair_accessible"],
        },
        2,
        2,
    );
});

Deno.test("evidence: a status block with both confidences null is not a value", async () => {
    // synthetic: nothing else came back, so the standard lane is refunded
    await settles(
        "synthetic-status-null-confidences",
        {
            ...NOWHERE,
            attributes: ["existence", "wheelchair_accessible"],
        },
        1,
        2,
    );
});

// ---------------------------------------------------------------------------
// the input schema
// ---------------------------------------------------------------------------

Deno.test("enrich schema has no pois/sample/estimate_only", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${FIXTURES}happy-standard.json`);
    // not offered: a list, a sample, a dry run, the cell shape, the
    // deprecated flag. Each is refused before any call goes out.
    const extras: Record<string, Json>[] = [
        { pois: [{ poi_name: "Tartine Bakery" }] },
        { sample: 1 },
        { estimate_only: true },
        { response_format: "cell" },
        { verify_identity: true },
    ];
    for (const extra of extras) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body: { ...PLACE, ...extra } },
                    mode: "replay",
                    resources: [OWNED],
                }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(extra),
        );
    }
    await assertInputAccepted({
        unit,
        input: { body: { ...PLACE, attributes: ["phone"] } },
        mode: "replay",
        fixture,
        resources: [OWNED],
    });
});

Deno.test("enrich schema: poi_name is required, bounds hold", async () => {
    const unit = await testSealedUnit(ID);
    const rejected: [string, Json][] = [
        ["no poi_name", { address: "600 Guerrero St" }],
        ["empty poi_name", { poi_name: "" }],
        ["poi_name over 200", { poi_name: "x".repeat(201) }],
        ["empty attributes", { poi_name: "A", attributes: [] }],
        ["21 attributes", {
            poi_name: "A",
            attributes: Array.from({ length: 21 }, (_, i) => "f" + i),
        }],
        ["an unknown include", {
            poi_name: "A",
            attributes: [{ name: "owners", include: ["fax"] }],
        }],
        ["latitude over 90", { poi_name: "A", latitude: 91 }],
        ["longitude under -180", { poi_name: "A", longitude: -181 }],
        ["negative max_credits", { poi_name: "A", max_credits: -1 }],
        ["a typo'd key", { poi_name: "A", attribute: ["phone"] }],
    ];
    for (const [shape, body] of rejected) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { body },
                    mode: "replay",
                    resources: [OWNED],
                }),
            Error,
            "INVALID_INPUT",
            shape,
        );
    }
    const accepted: Json[] = [
        { poi_name: "A" },
        { poi_name: "A", attributes: ["a".repeat(100)] },
        { poi_name: "A", latitude: 90, longitude: -180, max_credits: 0 },
        {
            poi_name: "A",
            attributes: [{
                name: "tier",
                description: "price tier",
                value_type: "enum",
                allowed_values: ["$", "$$"],
            }],
        },
    ];
    for (const body of accepted) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture: await loadFixture(`${FIXTURES}happy-standard.json`),
            resources: [OWNED],
        });
    }
});

// ---------------------------------------------------------------------------
// the sub-account relay
// ---------------------------------------------------------------------------

Deno.test("enrich declares the sub-account binding", async () => {
    const { doc } = await testSealedUnit(ID);
    assertEquals(doc.resources?.uses?.map((b) => b.id), ["voygr/sub-account"]);
});

Deno.test("enrich fails closed without a sub-account: nothing goes upstream", async () => {
    const loaded = await loadEndpoint({
        unit: await testSealedUnit(ID),
        input: {},
        mode: "replay", // no fixture: any upstream call fails the test
        scopeKey: "ws-1",
    });
    const result = await loaded.start({ body: PLACE });
    assert(result.kind === RunKind.COMPLETED);
    assertEquals(result.httpStatus, 503);
    assertEquals(
        (result.output as { code: string }).code,
        "SUB_ACCOUNT_UNAVAILABLE",
    );
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("enrich sends the body, the key and the workspace's sub-account", async () => {
    const sent: {
        url: string;
        method: string;
        headers: Headers;
        body: Json;
    }[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                sent.push({
                    url: String(url),
                    method: init?.method ?? "GET",
                    headers: new Headers(init?.headers),
                    body: JSON.parse(String(init?.body)),
                });
                return Promise.resolve(Response.json({
                    success: true,
                    attributes: {
                        phone: { value: { number: "+14155550100" } },
                    },
                }));
            },
        }),
        resources: fixtureReader([OWNED]),
        scopeKey: "ws-1",
    });
    const loaded = await engine.load(await testSealedUnit(ID));
    const body = {
        ...PLACE,
        attributes: ["phone", { name: "owners", include: ["email"] }],
        verify_name: true,
        max_credits: 5,
    };
    const result = await loaded.run({ body });
    assertEquals(result.httpStatus, 200);
    assertEquals(sent.length, 1);
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].url, "https://api.voygr.tech/v1/enrich");
    assertEquals(sent[0].body, body);
    assertEquals(sent[0].headers.get("x-api-key"), "test-key");
    assertEquals(sent[0].headers.get("x-sub-account"), SUB_ID);
    // phone 1 + owners 2 + email 1 + verify_name 1
    assertEquals(result.usage.credits, { default: 5 });
});

// ---------------------------------------------------------------------------
// the def
// ---------------------------------------------------------------------------

Deno.test("enrich waits as long as a research request can run", async () => {
    const { doc } = await testSealedUnit(ID);
    // our own CLI waits 3,700 s for a research enrich, longer than VOYGR's
    // limit
    assert(doc.timeouts.requestMs >= 3_700_000, String(doc.timeouts.requestMs));
    assert(doc.timeouts.runMs >= doc.timeouts.requestMs);
});

Deno.test("enrich: estimate and evidence are ONE fn (interned)", async () => {
    const { doc } = await testSealedUnit(ID);
    const usage = doc.usage as unknown as {
        estimate: { $fn: { key: string } };
        evidence: { $fn: { key: string } };
    };
    assertEquals(usage.estimate.$fn.key, usage.evidence.$fn.key);
});

Deno.test("enrich: POST /v1/enrich on the VOYGR origin", async () => {
    const { doc } = await testSealedUnit(ID);
    assertEquals(doc.request.method, "POST");
    assertEquals(doc.request.url, "https://api.voygr.tech/v1/enrich");
});

Deno.test({
    name:
        "voygr#enrich live: a standard request answers with its attributes and a bill",
    ignore: liveSkip("voygr"),
    fn: async () => {
        const result = await h.live({
            body: { ...PLACE, attributes: ["phone"] },
        });
        assertEquals(result.httpStatus, 200, JSON.stringify(result));
        assertEquals(result.isProviderError, false, JSON.stringify(result));
        const out = result.output as { success: boolean; attributes: Json };
        assertEquals(out.success, true);
        assertEquals(typeof out.attributes, "object");
        // the bill is a number of credits, whatever VOYGR's price is today
        assertEquals(typeof result.usage.credits.default, "number");
        assertEquals(typeof result.usage.evidence.CREDIT, "number");
    },
});
