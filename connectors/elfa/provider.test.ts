import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import type { Fixture } from "@shared/testing";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput>;
const METER = "x-elfa-credits";
const SLOW = ["elfa#v2/data/event-summary", "elfa#v2/data/trending-narratives"];
const METERED = "elfa#v3/events";
const METERED_INPUT: RunInput = {
    queryParams: { from: 1793232000, to: 1793318400, limit: 3 },
};

type Card =
    | { kind: "flat"; amount: number }
    | { kind: "objects"; key: string; rate: number; q: boolean }
    | { kind: "tier"; small: number; large: number; longRange?: number }
    | { kind: "accounts" };

const CARD: Record<string, Card> = {
    "elfa#v2/aggregations/trending-cas/telegram": { kind: "flat", amount: 1 },
    "elfa#v2/aggregations/trending-cas/twitter": { kind: "flat", amount: 1 },
    "elfa#v2/aggregations/trending-tokens": { kind: "flat", amount: 1 },
    "elfa#v2/data/event-summary": { kind: "flat", amount: 5 },
    "elfa#v2/data/keyword-mentions": { kind: "flat", amount: 1 },
    "elfa#v2/data/token-news": { kind: "flat", amount: 1 },
    "elfa#v2/data/top-mentions": { kind: "flat", amount: 1 },
    "elfa#v2/data/trending-narratives": { kind: "flat", amount: 5 },
    "elfa#v3/calls": { kind: "objects", key: "calls", rate: 1, q: false },
    "elfa#v3/calls/episodes": {
        kind: "objects",
        key: "episodes",
        rate: 2,
        q: false,
    },
    "elfa#v3/calls/positioning": { kind: "flat", amount: 2 },
    "elfa#v3/entities": { kind: "flat", amount: 1 },
    "elfa#v3/events": { kind: "objects", key: "events", rate: 1, q: true },
    "elfa#v3/events/arcs": { kind: "objects", key: "arcs", rate: 2, q: true },
    "elfa#v3/events/calendar": {
        kind: "objects",
        key: "entries",
        rate: 1,
        q: false,
    },
    "elfa#v3/events/prediction-markets": { kind: "flat", amount: 1 },
    "elfa#v3/events/storylines": {
        kind: "objects",
        key: "storylines",
        rate: 2,
        q: true,
    },
    "elfa#v3/market/crypto/call-book": { kind: "tier", small: 2, large: 4 },
    "elfa#v3/market/crypto/mindshare": { kind: "tier", small: 5, large: 10 },
    "elfa#v3/market/crypto/trending-contracts": {
        kind: "tier",
        small: 5,
        large: 10,
        longRange: 5,
    },
    "elfa#v3/market/equity/call-book": { kind: "tier", small: 2, large: 4 },
    "elfa#v3/market/equity/mindshare": { kind: "tier", small: 5, large: 10 },
    "elfa#v3/people/accounts": { kind: "accounts" },
    "elfa#v3/verify": { kind: "flat", amount: 1 },
};
const POST = "elfa#v3/verify";

const elfaIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("elfa#"))
        .sort();
};

const inputFor = (id: string): RunInput => {
    const input = INPUTS[id.split("#")[1]];
    assert(input !== undefined, `${id}: no test input in test-inputs.json`);
    return input;
};

const fixtureFor = (id: string, name: string) => {
    const [version, ...rest] = id.split("#")[1].split("/");
    return loadFixture(
        `${HERE}endpoints/${version}/${rest.join("-")}/fixtures/${name}.json`,
    );
};

const estimate = async (id: string, input: RunInput) =>
    estimateEndpoint(await testSealedUnit(id), input);

Deno.test("elfa docs: every endpoint is on the rate card", async () => {
    const ids = await elfaIds();
    assertEquals(ids.length, 24);
    assertEquals(Object.keys(CARD).sort(), ids);
});

Deno.test("elfa docs: one auth, one meter relay, one claim, one error digest", async () => {
    const bundle = await testBundle();
    const ids = await elfaIds();
    const first = bundle.endpoints[ids[0]];
    assert(first.lifecycle?.start);
    assert(first.usage.consolidate);
    assert(first.output.fromError);
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(doc.lifecycle?.start, first.lifecycle?.start, id);
        assertEquals(doc.usage.consolidate, first.usage.consolidate, id);
        assertEquals(doc.output.fromError, first.output.fromError, id);
        assertEquals(doc.output.fromResponse, undefined, id);
        assertEquals(
            doc.usage.credits,
            { default: { label: "Elfa credits" } },
            id,
        );
        assertEquals(doc.request.method, id === POST ? "POST" : "GET", id);
        assert(
            doc.request.url.startsWith("https://api.elfa.ai/v"),
            `${id}: ${doc.request.url}`,
        );
        const budget = SLOW.includes(id) ? 180_000 : 60_000;
        assertEquals(doc.timeouts, { requestMs: budget, runMs: budget }, id);
    }
});

Deno.test("elfa docs: the model states the published rate card", async () => {
    const bundle = await testBundle();
    for (const [id, card] of Object.entries(CARD)) {
        const model = bundle.endpoints[id].usage.model;
        if (card.kind === "flat") {
            assertEquals(model, {
                kind: "PER_CALL",
                label: "call",
                consumes: { credit: "default", amount: card.amount },
            }, id);
            continue;
        }
        assert(model.kind === "COMPOSITE", id);
        const amounts = Object.fromEntries(
            Object.entries(model.components).map((
                [line, component],
            ) => [line, component.consumes.amount]),
        );
        if (card.kind === "objects") {
            assertEquals(amounts, { request: 1, [card.key]: card.rate }, id);
        } else if (card.kind === "tier") {
            assertEquals(amounts, {
                up_to_50: card.small,
                up_to_200: card.large,
                ...(card.longRange ? { long_range: card.longRange } : {}),
            }, id);
        } else {
            assertEquals(amounts, {
                standing_up_to_50: 5,
                standing_up_to_200: 10,
                track_up_to_50: 25,
                track_up_to_200: 50,
            }, id);
        }
    }
});

Deno.test("elfa: a recorded 2xx settles the meter, or the card without one", async () => {
    for (const id of await elfaIds()) {
        const card = CARD[id];
        const input = inputFor(id);
        const fixture = await fixtureFor(id, "happy");
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.output, fixture.calls[0].res.body, id);
        const query = input.queryParams ?? {};
        const limit = Number(query.limit ?? 50);
        const headers = fixture.calls[0].res.headers ?? {};
        const meter = Number(headers[METER] ?? 0);
        const detail = Object.fromEntries(
            (headers["x-elfa-credits-detail"] ?? "").split(";").filter(
                Boolean,
            ).map((part) => part.split("=")).map(([k, v]) => [k, Number(v)]),
        );
        const window = detail.base === undefined
            ? undefined
            : detail.window ?? 0;
        let evidence: Record<string, number>;
        let derived: number;
        if (card.kind === "flat") {
            evidence = { CALL: 1 };
            derived = card.amount;
        } else if (card.kind === "objects") {
            const list = (result.output as Record<string, Json>)[card.key];
            assert(Array.isArray(list), `${id}: no ${card.key} array`);
            const count = detail.base !== undefined &&
                    detail.objects !== undefined
                ? detail.objects / card.rate
                : list.length;
            evidence = { request: 1, [card.key]: count };
            derived = 1 + card.rate * count;
        } else if (card.kind === "tier") {
            const band = limit <= 50 ? card.small : card.large;
            evidence = {
                up_to_50: limit <= 50 ? 1 : 0,
                up_to_200: limit > 50 ? 1 : 0,
            };
            derived = band;
            if (card.longRange !== undefined) {
                const long = window !== undefined
                    ? window > 0 ? 1 : 0
                    : query.to !== undefined &&
                            Number(query.to) - Number(query.from) > 86_700
                    ? 1
                    : 0;
                evidence.long_range = long;
                derived += long * card.longRange;
            }
        } else {
            const standing = query.metric === undefined ||
                query.metric === "standing";
            evidence = {
                standing_up_to_50: standing && limit <= 50 ? 1 : 0,
                standing_up_to_200: standing && limit > 50 ? 1 : 0,
                track_up_to_50: !standing && limit <= 50 ? 1 : 0,
                track_up_to_200: !standing && limit > 50 ? 1 : 0,
            };
            derived = standing
                ? (limit <= 50 ? 5 : 10)
                : (limit <= 50 ? 25 : 50);
        }
        if (detail.base !== undefined) {
            assertEquals(
                detail.base + (detail.objects ?? 0) + (detail.window ?? 0),
                meter,
                `${id}: detail sums to the meter`,
            );
            assertEquals(derived, meter, `${id}: fold matches the meter`);
        }
        assertEquals(result.usage, {
            credits: { default: meter > 0 ? meter : derived },
            evidence,
            ...(meter > 0 && meter !== derived
                ? { mismatch: { derived: { default: derived } } }
                : {}),
        }, id);
    }
});

Deno.test("elfa: the x-elfa-credits claim wins over the card", async () => {
    const unit = await testSealedUnit(METERED);
    for (const charged of [4, 2, 1]) {
        const fixture = await loadFixture(
            `${HERE}fixtures/synthetic-metered.json`,
        );
        fixture.calls[0].res.headers = { [METER]: String(charged) };
        const result = await runEndpoint({
            unit,
            input: METERED_INPUT,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.output, fixture.calls[0].res.body);
        assertEquals(result.usage, {
            credits: { default: charged },
            evidence: { request: 1, events: 3 },
            ...(charged !== 4 ? { mismatch: { derived: { default: 4 } } } : {}),
        }, String(charged));
    }
});

Deno.test("elfa: a missing or malformed meter falls back to the card", async () => {
    const unit = await testSealedUnit(METERED);
    for (
        const headers of [
            {} as Record<string, string>,
            { [METER]: "" },
            { [METER]: "-1" },
            { [METER]: "1.5" },
            { [METER]: "1e2" },
            { [METER]: "NaN" },
            { [METER]: "0" },
            { [METER]: "9007199254740992" },
        ]
    ) {
        const fixture = await loadFixture(
            `${HERE}fixtures/synthetic-metered.json`,
        );
        fixture.calls[0].res.headers = headers;
        const result = await runEndpoint({
            unit,
            input: METERED_INPUT,
            mode: "replay",
            fixture,
        });
        assertEquals(result.usage, {
            credits: { default: 4 },
            evidence: { request: 1, events: 3 },
        }, JSON.stringify(headers));
    }
});

Deno.test("elfa: provider errors settle zero and are digested", async () => {
    const unit = await testSealedUnit(METERED);
    const cases: { status: number; body: Json; output: Json }[] = [
        {
            status: 401,
            body: {
                code: "ERR_UNAUTHORIZED",
                message: "Invalid API key",
                errorId: "a1b2c3d4",
                requestId: "req-1",
            },
            output: {
                message: "Invalid API key",
                code: "ERR_UNAUTHORIZED",
                raw: {
                    code: "ERR_UNAUTHORIZED",
                    message: "Invalid API key",
                    errorId: "a1b2c3d4",
                    requestId: "req-1",
                },
            },
        },
        {
            status: 429,
            body: { success: false, error: "Rate limit exceeded" },
            output: {
                message: "Rate limit exceeded",
                raw: { success: false, error: "Rate limit exceeded" },
            },
        },
        {
            status: 502,
            body: "Bad Gateway",
            output: { message: "Elfa API error", raw: "Bad Gateway" },
        },
    ];
    for (const scenario of cases) {
        const fixture = await loadFixture(
            `${HERE}fixtures/synthetic-metered.json`,
        );
        fixture.calls[0].res.status = scenario.status;
        fixture.calls[0].res.headers = { [METER]: "1" };
        fixture.calls[0].res.body = scenario.body;
        const result = await runEndpoint({
            unit,
            input: METERED_INPUT,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, scenario.status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, scenario.output);
    }
});

Deno.test("elfa: estimates price the hold from the input", async () => {
    const cases: [string, RunInput, Record<string, number>][] = [
        ["elfa#v3/events", { queryParams: { from: 1 } }, { default: 11 }],
        [
            "elfa#v3/events",
            { queryParams: { from: 1, limit: 30 } },
            { default: 31 },
        ],
        ["elfa#v3/events", { queryParams: { q: "solana outage" } }, {
            default: 11,
        }],
        ["elfa#v3/events/storylines", {
            queryParams: { q: "stablecoin regulation" },
        }, { default: 21 }],
        [
            "elfa#v3/events",
            {
                queryParams: {
                    eventIds: [
                        "00000000-0000-4000-8000-000000000001",
                        "00000000-0000-4000-8000-000000000002",
                    ],
                },
            },
            { default: 3 },
        ],
        ["elfa#v3/events/storylines", { queryParams: { from: 1 } }, {
            default: 21,
        }],
        ["elfa#v3/events/arcs", { queryParams: {} }, { default: 21 }],
        ["elfa#v3/events/arcs", { queryParams: { q: "ai agents" } }, {
            default: 21,
        }],
        [
            "elfa#v3/events/arcs",
            {
                queryParams: {
                    arcIds: ["00000000-0000-4000-8000-000000000001"],
                },
            },
            { default: 3 },
        ],
        ["elfa#v3/calls", { queryParams: { from: 1 } }, { default: 11 }],
        [
            "elfa#v3/calls",
            {
                queryParams: {
                    callIds: [
                        "00000000-0000-4000-8000-000000000001",
                        "00000000-0000-4000-8000-000000000002",
                    ],
                },
            },
            { default: 3 },
        ],
        ["elfa#v3/calls/episodes", { queryParams: { from: 1, limit: 5 } }, {
            default: 11,
        }],
        ["elfa#v3/market/crypto/mindshare", { queryParams: {} }, {
            default: 5,
        }],
        ["elfa#v3/market/crypto/mindshare", { queryParams: { limit: 51 } }, {
            default: 10,
        }],
        [
            "elfa#v3/market/crypto/trending-contracts",
            { queryParams: { from: 1, to: 86_401 } },
            { default: 5 },
        ],
        [
            "elfa#v3/market/crypto/trending-contracts",
            { queryParams: { from: 1, to: 86_701 } },
            { default: 5 },
        ],
        [
            "elfa#v3/market/crypto/trending-contracts",
            { queryParams: { from: 1, to: 86_702, limit: 200 } },
            { default: 15 },
        ],
        [
            "elfa#v3/market/crypto/trending-contracts",
            { queryParams: { from: 1 } },
            { default: 10 },
        ],
        ["elfa#v3/people/accounts", { queryParams: {} }, { default: 5 }],
        [
            "elfa#v3/people/accounts",
            { queryParams: { metric: "hitRate", limit: 100 } },
            { default: 50 },
        ],
        ["elfa#v2/data/event-summary", {
            queryParams: { keywords: "solana" },
        }, { default: 5 }],
        ["elfa#v3/events/calendar", { queryParams: {} }, { default: 11 }],
        ["elfa#v3/events/calendar", { queryParams: { limit: 30 } }, {
            default: 31,
        }],
        ["elfa#v3/verify", { body: { statement: "BTC hit 100k" } }, {
            default: 1,
        }],
        [
            "elfa#v3/events/prediction-markets",
            { queryParams: { ids: ["00000000-0000-4000-8000-000000000001"] } },
            { default: 1 },
        ],
    ];
    for (const [id, input, credits] of cases) {
        const usage = await estimate(id, input);
        assertEquals(usage.credits, credits, `${id} ${JSON.stringify(input)}`);
    }
});

Deno.test("elfa: every input schema is strict", async () => {
    for (const id of await elfaIds()) {
        const input = inputFor(id);
        await assertRejects(
            () =>
                estimate(id, {
                    ...(input.body !== undefined
                        ? {
                            body: {
                                ...(input.body as Record<string, Json>),
                                not_an_elfa_param: 1,
                            },
                        }
                        : {
                            queryParams: {
                                ...input.queryParams,
                                not_an_elfa_param: 1,
                            },
                        }),
                }),
            Error,
            "INVALID_INPUT",
            id,
        );
    }
});

const chain = (
    url: string,
    body: Json,
    headers: Record<string, string>,
    status = 200,
): Fixture => ({
    name: "inline",
    description: "Inline synthetic chain for one billing scenario.",
    calls: [{ req: { method: "GET", url }, res: { status, headers, body } }],
});

Deno.test("elfa: the detail header makes evidence agree with the meter", async () => {
    const cases: [Record<string, string>, Record<string, number>, number][] = [
        [
            {
                [METER]: "2",
                "x-elfa-credits-detail": "base=1;objects=1;dedup=2",
            },
            {
                request: 1,
                events: 1,
            },
            2,
        ],
        [{
            [METER]: "3",
            "x-elfa-credits-detail": "base=1;objects=2;dedup=1;q=0",
        }, {
            request: 1,
            events: 2,
        }, 3],
        [
            {
                [METER]: "0",
                "x-elfa-credits-detail": "base=1;objects=1;dedup=2",
            },
            {
                request: 1,
                events: 1,
            },
            2,
        ],
        [{ "x-elfa-credits-detail": "base=1;objects=0;dedup=3" }, {
            request: 1,
            events: 0,
        }, 1],
        [{ [METER]: "4", "x-elfa-credits-detail": "base=1" }, {
            request: 1,
            events: 3,
        }, 4],
        [{ [METER]: "4", "x-elfa-credits-detail": "objects=1" }, {
            request: 1,
            events: 3,
        }, 4],
    ];
    for (const [headers, evidence, credits] of cases) {
        const fixture = await loadFixture(
            `${HERE}fixtures/synthetic-metered.json`,
        );
        fixture.calls[0].res.headers = headers;
        const result = await runEndpoint({
            unit: await testSealedUnit(METERED),
            input: METERED_INPUT,
            mode: "replay",
            fixture,
        });
        assertEquals(result.usage, {
            credits: { default: credits },
            evidence,
        }, JSON.stringify(headers));
    }
});

Deno.test("elfa: the detail window settles the trending-contracts surcharge", async () => {
    const id = "elfa#v3/market/crypto/trending-contracts";
    const input: RunInput = { queryParams: { from: 1793232000 } };
    const url = "{{request.url}}?from=1793232000&limit=50";
    const body = {
        contracts: [],
        nextCursor: null,
        hasMore: false,
        servedFrom: 1793232000,
    };
    for (
        const [detail, credits, longRange] of [
            ["base=5", 5, 0],
            ["base=5;window=5", 10, 1],
            [undefined, 5, 0],
        ] as const
    ) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input,
            mode: "replay",
            fixture: chain(
                url,
                body,
                detail === undefined ? {} : {
                    [METER]: String(credits),
                    "x-elfa-credits-detail": detail,
                },
            ),
        });
        assertEquals(result.usage, {
            credits: { default: credits },
            evidence: { up_to_50: 1, up_to_200: 0, long_range: longRange },
        }, String(detail));
    }
});

Deno.test("elfa: v2 settles its meter and zero-bills its errors", async () => {
    const id = "elfa#v2/data/trending-narratives";
    const input: RunInput = { queryParams: {} };
    const url =
        "{{request.url}}?timeFrame=day&maxNarratives=7&maxTweetsPerNarrative=5";
    const empty = await runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        fixture: chain(url, {
            success: true,
            data: { trending_narratives: [] },
        }, {
            [METER]: "1",
        }),
    });
    assertEquals(empty.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
        mismatch: { derived: { default: 5 } },
    });
    const failed = await runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        fixture: chain(url, { success: false, error: "Service unavailable" }, {
            [METER]: "1",
        }, 503),
    });
    assertEquals(failed.isProviderError, true);
    assertEquals(failed.usage, { credits: {}, evidence: {} });
});

Deno.test("elfa: array params are sent comma-joined", async () => {
    const ids = Array.from(
        { length: 30 },
        (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    const result = await runEndpoint({
        unit: await testSealedUnit(METERED),
        input: { queryParams: { eventIds: ids } },
        mode: "replay",
        fixture: chain(
            `{{request.url}}?eventIds=${ids.join("%2C")}&limit=10`,
            { events: [], nextCursor: null, hasMore: false, servedFrom: null },
            { [METER]: "1" },
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 1 });
});

Deno.test("elfa: mirrors refuse what Elfa's validators refuse", async () => {
    const refused: [string, Record<string, Json>][] = [
        ["elfa#v3/market/crypto/call-book", {}],
        ["elfa#v3/entities", {}],
        ["elfa#v3/entities", { q: "x".repeat(129) }],
        ["elfa#v3/events", { from: 1, eventType: "spam" }],
        ["elfa#v3/events", { from: 1, entityIds: ["bitcoin"] }],
        ["elfa#v3/events", { from: 1, limit: 31 }],
        ["elfa#v3/calls/positioning", { entityId: "bitcoin" }],
        ["elfa#v3/calls", { from: 1, handle: "x".repeat(41) }],
        ["elfa#v3/calls", { from: 1, handle: "@" }],
        ["elfa#v3/events", { eventIds: [] }],
        ["elfa#v3/events", { q: "   " }],
        ["elfa#v3/entities", { q: " " }],
        ["elfa#v2/aggregations/trending-tokens", { timeWindow: "7days" }],
        ["elfa#v2/aggregations/trending-tokens", { pageSize: 101 }],
        ["elfa#v2/data/keyword-mentions", { keywords: "a,b,c,d,e,f" }],
        ["elfa#v2/data/keyword-mentions", { keywords: "a", cursor: "next" }],
        ["elfa#v2/data/top-mentions", {}],
        ["elfa#v2/data/keyword-mentions", {}],
        ["elfa#v2/data/keyword-mentions", { limit: 5, timeWindow: "24h" }],
        ["elfa#v3/events", { from: 1, eventCategory: ["rumor"] }],
        ["elfa#v3/events", { from: 1, eventCategory: [] }],
        ["elfa#v3/events/calendar", { minImportance: 101 }],
        ["elfa#v3/events/calendar", { category: ["sports"] }],
        ["elfa#v3/events/calendar", { limit: 31 }],
        ["elfa#v3/events/prediction-markets", {}],
        ["elfa#v3/events/prediction-markets", { ids: ["bitcoin"] }],
        [
            "elfa#v3/events/prediction-markets",
            {
                ids: Array.from(
                    { length: 31 },
                    (_, i) =>
                        `00000000-0000-4000-8000-${
                            String(i).padStart(12, "0")
                        }`,
                ),
            },
        ],
        ["elfa#v3/events/prediction-markets", {
            ids: ["00000000-0000-4000-8000-000000000001"],
            limit: 0,
        }],
        ["elfa#v3/events/calendar", { status: [] }],
        ["elfa#v3/events/calendar", { confidence: ["certain"] }],
        ["elfa#v3/events/calendar", { minImportance: 1.5 }],
    ];
    for (const [id, queryParams] of refused) {
        await assertRejects(
            () => estimate(id, { queryParams }),
            Error,
            "INVALID_INPUT",
            `${id} ${JSON.stringify(queryParams)}`,
        );
    }
    await estimate("elfa#v2/data/keyword-mentions", {
        queryParams: { keywords: "a,b,c,d,e", cursor: 1793318400000 },
    });
    await estimate("elfa#v2/data/keyword-mentions", {
        queryParams: { accountName: "elonmusk" },
    });
    await estimate("elfa#v2/data/keyword-mentions", {
        queryParams: { keywords: "solana", accountName: "elonmusk" },
    });
    const bodies: Record<string, Json>[] = [
        {},
        { statement: "  " },
        { statement: "x".repeat(501) },
        { statement: "a", context: "x".repeat(4001) },
        { statement: "a", decision: { type: "maybe" } },
        { statement: "a", decision: { type: "yesNo", options: [] } },
        {
            statement: "a",
            decision: {
                type: "choice",
                options: [{ label: "up", definition: "price rises" }],
            },
        },
        { statement: "a", decision: { type: "score", levels: ["low"] } },
        {
            statement: "a",
            decision: {
                type: "score",
                levels: Array.from({ length: 11 }, (_, i) => `level ${i}`),
            },
        },
        {
            statement: "a",
            decision: {
                type: "choice",
                options: Array.from({ length: 21 }, (_, i) => ({
                    label: `option ${i}`,
                    definition: "applies",
                })),
            },
        },
        {
            statement: "a",
            decision: {
                type: "choice",
                options: [
                    { label: "x".repeat(101), definition: "a" },
                    { label: "b", definition: "b" },
                ],
            },
        },
        {
            statement: "a",
            decision: {
                type: "choice",
                options: [
                    { label: "a", definition: "a", weight: 1 },
                    { label: "b", definition: "b" },
                ],
            },
        },
        { statement: "a", asOf: -1 },
    ];
    await assertRejects(
        () =>
            estimate(POST, {
                body: { statement: "a" },
                queryParams: { foo: "bar" },
            }),
        Error,
        "INVALID_INPUT",
    );
    for (const body of bodies) {
        await assertRejects(
            () => estimate(POST, { body }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    for (
        const decision of [
            { type: "yesNo", yes: "approved by the SEC" } as Json,
            {
                type: "choice",
                options: [
                    { label: "up", definition: "price rises" },
                    { label: "down", definition: "price falls" },
                ],
            },
            { type: "score", levels: ["low", "high"] },
        ]
    ) {
        await estimate(POST, { body: { statement: "a", decision } });
    }
});

Deno.test("elfa: twin endpoints intern one usage fn", async () => {
    const bundle = await testBundle();
    const key = (id: string, hook: "estimate" | "evidence") =>
        bundle.endpoints[id].usage[hook].$fn.key;
    for (const hook of ["estimate", "evidence"] as const) {
        assertEquals(
            key("elfa#v3/market/crypto/call-book", hook),
            key("elfa#v3/market/equity/call-book", hook),
        );
        assertEquals(
            key("elfa#v3/market/crypto/call-book", hook),
            key("elfa#v3/market/crypto/mindshare", hook),
        );
        assertEquals(
            key("elfa#v3/market/crypto/mindshare", hook),
            key("elfa#v3/market/equity/mindshare", hook),
        );
    }
});

Deno.test({
    name: "elfa#v3/events live (gated on ELFA_API_KEY)",
    ignore: liveSkip("elfa"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(METERED),
            input: inputFor(METERED),
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assert(Array.isArray((result.output as { events?: Json }).events));
        assertEquals(typeof result.usage.credits.default, "number");
    },
});

Deno.test("elfa: verify posts its body as JSON with no query string", async () => {
    const sent: Request[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (input, init) => {
                sent.push(new Request(input, init));
                return Promise.resolve(
                    new Response(
                        JSON.stringify({ verdict: "supported" }),
                        {
                            status: 200,
                            headers: {
                                "content-type": "application/json",
                                [METER]: "1",
                                "x-elfa-credits-detail": "base=1",
                            },
                        },
                    ),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(POST));
    const body = {
        statement: "BTC hit 100k",
        decision: { type: "yesNo", yes: "it traded above 100k" },
    };
    const result = await loaded.run({ body });
    assertEquals(sent.length, 1);
    assertEquals(sent[0].method, "POST");
    assertEquals(sent[0].url, "https://api.elfa.ai/v3/verify");
    assertEquals(sent[0].headers.get("x-elfa-api-key"), "test-key");
    assert(sent[0].headers.get("content-type")?.includes("application/json"));
    assertEquals(await sent[0].json(), body);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
});

Deno.test("elfa: track-record rankings settle the wider band", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("elfa#v3/people/accounts"),
        input: { queryParams: { metric: "hitRate", limit: 100 } },
        mode: "replay",
        fixture: chain(
            "{{request.url}}?metric=hitRate&limit=100",
            { accounts: [], nextCursor: null, hasMore: false },
            { [METER]: "50", "x-elfa-credits-detail": "base=50" },
        ),
    });
    assertEquals(result.usage, {
        credits: { default: 50 },
        evidence: {
            standing_up_to_50: 0,
            standing_up_to_200: 0,
            track_up_to_50: 0,
            track_up_to_200: 1,
        },
    });
});
