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
 * THE twittrapi suite (the litescrape D6 layout): 18 docs of ONE billing
 * shape — a provider-level PER_UNIT·PAGE line at the Standard per-call
 * price, settled 0|1 off the simple envelope's `data` — so the tests live
 * once here and iterate the catalog, while every endpoint keeps its OWN
 * recorded fixtures under `endpoints/<folder>/fixtures/` (replay matches on
 * the exact wire URL, so a shared chain cannot serve query-bearing GETs;
 * `deno task record` writes there too).
 *
 * TwittrAPI declares NO `usage.consolidate`: no response body carries a
 * meter, so the DERIVED fold is the settled answer on every run and no
 * `mismatch` key can appear (zUsage is strict; deep-equality proves its
 * absence). The rate table below is therefore the only thing standing
 * between a typo and a wrong bill.
 */

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput>;

const inputFor = (id: string): RunInput => {
    const input = INPUTS[id.split("#")[1]];
    assert(input !== undefined, `${id}: no test input in test-inputs.json`);
    return input;
};

/**
 * TwittrAPI's draw per endpoint, in US dollars — $0.0001 per call on EVERY
 * endpoint: $0.10 per 1,000 calls at the Standard tier
 * (https://www.twittrapi.com/pricing.json, captured 2026-10-15). Written as
 * LITERALS on purpose (clay D7a): deriving them from each doc's own model
 * would make this test a tautology. A new endpoint must state its row here,
 * with the folder its fixtures live in.
 */
const ENDPOINTS: Record<string, { rate: number; folder: string }> = {
    "twittrapi#communities/search/{searchTerm}": {
        rate: 0.0001,
        folder: "communities-search",
    },
    "twittrapi#lists/members": { rate: 0.0001, folder: "list-members" },
    "twittrapi#lists/tweets": { rate: 0.0001, folder: "list-tweets" },
    "twittrapi#search": { rate: 0.0001, folder: "search" },
    "twittrapi#simpletweet/{tweetId}": { rate: 0.0001, folder: "tweet" },
    "twittrapi#trends/{locationId}": { rate: 0.0001, folder: "trends" },
    "twittrapi#tweet/{tweetId}": { rate: 0.0001, folder: "tweet-thread" },
    "twittrapi#tweet/{tweetId}/quotes": {
        rate: 0.0001,
        folder: "tweet-quotes",
    },
    "twittrapi#tweet/{tweetId}/retweets": {
        rate: 0.0001,
        folder: "tweet-retweets",
    },
    "twittrapi#user/about/{username}": { rate: 0.0001, folder: "user-about" },
    "twittrapi#user/by/username/{username}": {
        rate: 0.0001,
        folder: "user-by-username",
    },
    "twittrapi#user/users/by/ids": { rate: 0.0001, folder: "users-by-ids" },
    "twittrapi#user/{userId}/followers": {
        rate: 0.0001,
        folder: "user-followers",
    },
    "twittrapi#user/{userId}/followings": {
        rate: 0.0001,
        folder: "user-followings",
    },
    "twittrapi#user/{userId}/media": { rate: 0.0001, folder: "user-media" },
    "twittrapi#user/{userId}/tweets": { rate: 0.0001, folder: "user-tweets" },
    "twittrapi#user/{userId}/tweets-and-replies": {
        rate: 0.0001,
        folder: "user-tweets-and-replies",
    },
    "twittrapi#user/{userId}/verified-followers": {
        rate: 0.0001,
        folder: "user-verified-followers",
    },
};

/** The two ids pinned away from a camelCase wire segment (ids are
 *  lowercase — design D22). */
const PINNED: Record<string, string> = {
    "twittrapi#user/{userId}/tweets-and-replies":
        "https://api.twittrapi.com/user/{userId}/tweetsAndReplies",
    "twittrapi#user/{userId}/verified-followers":
        "https://api.twittrapi.com/user/{userId}/verifiedFollowers",
};

const fixtureFor = (id: string, name: string) =>
    loadFixture(
        `${HERE}endpoints/${ENDPOINTS[id].folder}/fixtures/${name}.json`,
    );

const twittrapiIds = async (): Promise<string[]> => {
    const bundle = await testBundle();
    return Object.keys(bundle.endpoints)
        .filter((id) => id.startsWith("twittrapi#"))
        .sort();
};

/** Validate-only run: the estimate derives the input without IO, so a
 *  rejecting transport proves whether an input passes the compiled gate. */
const estimate = async (id: string, input: RunInput) => {
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not IO")),
        }),
    });
    const loaded = await engine.load(await testSealedUnit(id));
    return await loaded.estimate(input);
};

const rejects = (id: string, input: RunInput) =>
    assertRejects(() => estimate(id, input), Error, "INVALID_INPUT");

// ---------------------------------------------------------------------------
// the catalog
// ---------------------------------------------------------------------------

Deno.test("twittrapi docs: every endpoint is in the rate table", async () => {
    const ids = await twittrapiIds();
    assertEquals(ids.length, 18);
    // a new endpoint must state its draw
    assertEquals(Object.keys(ENDPOINTS).sort(), ids);
    // and its test input
    assertEquals(
        Object.keys(INPUTS).sort(),
        ids.map((id) => id.split("#")[1]).sort(),
    );
});

Deno.test("twittrapi docs: one auth, one wire profile, one error digest, one rate card, no consolidate", async () => {
    const bundle = await testBundle();
    const ids = await twittrapiIds();
    const first = bundle.endpoints[ids[0]];
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(
            bundle.fnTable[doc.auth.inject.$fn.key].provenance,
            "presets#auth.header",
            id,
        );
        // the format=simple / CSV / JSON wire profile is the provider's
        assert(doc.input.toRequest, `${id}: the wire profile must run`);
        assertEquals(
            doc.input.toRequest?.$fn.key,
            first.input.toRequest?.$fn.key,
            id,
        );
        assert(doc.output.fromError, `${id}: the error digest must run`);
        assertEquals(
            doc.output.fromError?.$fn.key,
            first.output.fromError?.$fn.key,
            id,
        );
        // the simple envelope is relayed verbatim
        assertEquals(doc.output.fromResponse, undefined, id);
        // no vendor claim anywhere: the derived fold is the bill
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(doc.usage.model, {
            kind: "PER_UNIT",
            unit: "PAGE",
            every: 1,
            label: "pages with results",
            description:
                "calls whose response carried at least one item in `data`",
            consumes: { credit: "default", amount: ENDPOINTS[id].rate },
        }, id);
        assertEquals(
            doc.usage.credits,
            { default: { label: "US dollars" } },
            id,
        );
        // the one-page promise and the 0|1 settle are the provider's
        assertEquals(
            doc.usage.estimate.$fn.key,
            first.usage.estimate.$fn.key,
            id,
        );
        assertEquals(
            doc.usage.evidence.$fn.key,
            first.usage.evidence.$fn.key,
            id,
        );
        assertEquals(
            bundle.fnTable[doc.usage.evidence.$fn.key].provenance
                .startsWith("connectors/twittrapi/provider"),
            true,
            id,
        );
        assertEquals(doc.lifecycle, undefined, id);
        assertEquals(doc.timeouts, { requestMs: 65_000, runMs: 70_000 }, id);
        assertEquals(doc.request.method, "GET", id);
        assertEquals(
            doc.request.url,
            PINNED[id] ?? `https://api.twittrapi.com/${id.split("#")[1]}`,
            id,
        );
        assertEquals(
            doc.request.headers?.["User-Agent"]?.startsWith(
                "monid-connector-twittrapi/",
            ),
            true,
            id,
        );
        assertEquals(
            doc.meta.docsUrl?.startsWith(
                "https://www.twittrapi.com/docs/reference/",
            ),
            true,
            id,
        );
        assertEquals(doc.meta.categories, ["twitter"], id);
        // the provider's paging and empty-success notes reach every doc
        const notes = (doc.meta.notes ?? []).join(" ");
        assert(notes.includes("One run is one page"), id);
        assert(notes.includes("records 0 for a 200"), id);
    }
});

Deno.test("twittrapi schemas: strict mirrors, no format knob, no binding defaults", async () => {
    const bundle = await testBundle();
    for (const id of await twittrapiIds()) {
        const schema = bundle.endpoints[id].input.schema as Record<
            string,
            Json
        >;
        const arms = (s: Json | undefined) => {
            if (s === undefined || s === null) return [];
            const o = s as { anyOf?: Json[] };
            return (o.anyOf ?? [s]) as {
                additionalProperties: boolean;
                properties: Record<string, { default?: Json }>;
            }[];
        };
        for (
            const arm of [
                ...arms(schema.queryParams),
                ...arms(schema.pathParams),
            ]
        ) {
            assertEquals(arm.additionalProperties, false, id);
            assertEquals("format" in arm.properties, false, id);
            for (const [name, prop] of Object.entries(arm.properties)) {
                assertEquals(prop.default, undefined, `${id}: ${name}`);
            }
        }
    }
});

// ---------------------------------------------------------------------------
// the 18 relays
// ---------------------------------------------------------------------------

Deno.test("twittrapi: every endpoint's recorded happy run draws one page and relays the simple envelope verbatim", async () => {
    for (const id of await twittrapiIds()) {
        const fixture = await fixtureFor(id, "recorded-happy");
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, {
            credits: { default: ENDPOINTS[id].rate },
            evidence: { PAGE: 1 },
        }, id);
        assertEquals(result.output, fixture.calls[0].res.body, id);
        // the wire profile asked for the simple format
        const url = new URL(fixture.calls[0].req.url);
        assertEquals(url.searchParams.get("format"), "simple", id);
        assertEquals(url.origin, "https://api.twittrapi.com", id);
    }
});

Deno.test("twittrapi: pages carry the simple paging envelope; lookups carry one object", async () => {
    const lookups = new Set([
        "twittrapi#simpletweet/{tweetId}",
        "twittrapi#user/about/{username}",
        "twittrapi#user/by/username/{username}",
    ]);
    for (const id of await twittrapiIds()) {
        const body = (await fixtureFor(id, "recorded-happy")).calls[0].res
            .body as Record<string, Json>;
        if (lookups.has(id)) {
            assertEquals(Object.keys(body), ["data"], id);
            assertEquals(typeof body.data, "object", id);
            assertEquals(Array.isArray(body.data), false, id);
        } else {
            assertEquals(
                Object.keys(body).sort(),
                ["data", "hasNextPage", "nextCursor", "previousCursor"],
                id,
            );
            assert(Array.isArray(body.data), id);
        }
    }
});

Deno.test("twittrapi: the wire profile — ids travel comma-joined, filters JSON-encoded", async () => {
    // replay matches the exact wire URL, so a successful replay IS the
    // proof; this pins what the recorded URL says on the wire
    const ids = new URL(
        (await fixtureFor("twittrapi#user/users/by/ids", "recorded-happy"))
            .calls[0].req.url,
    );
    assertEquals(ids.searchParams.getAll("ids"), ["2244994945,11348282"]);

    const id = "twittrapi#search";
    const input: RunInput = {
        queryParams: {
            searchItem: "nasa",
            count: 5,
            filters: {
                lang: "en",
                minimumLikesCount: 100,
                removeReplies: true,
            },
        },
    };
    const fixture = await fixtureFor(id, "recorded-filters");
    const url = new URL(fixture.calls[0].req.url);
    assertEquals(
        JSON.parse(url.searchParams.get("filters") ?? "null"),
        input.queryParams?.filters,
    );
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.0001 },
        evidence: { PAGE: 1 },
    });
});

Deno.test("twittrapi: an empty success records 0 — empty page, unknown tweet, unknown handle", async () => {
    for (
        const [id, name, input] of [
            [
                "twittrapi#tweet/{tweetId}/quotes",
                "recorded-empty",
                {
                    pathParams: { tweetId: "2019881223666233717" },
                    queryParams: { count: 5 },
                },
            ],
            [
                "twittrapi#simpletweet/{tweetId}",
                "recorded-no-such-tweet",
                { pathParams: { tweetId: "1" } },
            ],
            [
                "twittrapi#user/by/username/{username}",
                "recorded-no-such-user",
                { pathParams: { username: "zxqv_nosuch_987" } },
            ],
        ] as const
    ) {
        const fixture = await fixtureFor(id, name);
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: input as RunInput,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, {
            credits: {},
            evidence: { PAGE: 0 },
        }, id);
        assertEquals(result.output, fixture.calls[0].res.body, id);
    }
});

Deno.test("twittrapi: a 401 is data — zero usage, the error body digested", async () => {
    const id = "twittrapi#user/by/username/{username}";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: inputFor(id),
        mode: "replay",
        fixture: await fixtureFor(id, "recorded-unauthorized"),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, Json>;
    assertEquals(output.message, "user not found");
    assertEquals(output.raw, { error: "user not found" });
});

Deno.test("twittrapi: a 422 (the vendor charges it) is data — zero usage here", async () => {
    const id = "twittrapi#search";
    const result = await runEndpoint({
        unit: await testSealedUnit(id),
        input: {
            queryParams: {
                searchItem: "nasa",
                filters: { removeReplies: true, onlyReplies: true },
            },
        },
        mode: "replay",
        fixture: await fixtureFor(id, "recorded-invalid-filters"),
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { message: string }).message,
        'filters "removeReplies" and "onlyReplies" cannot both be true',
    );
});

Deno.test("twittrapi: the estimate holds one page on every endpoint", async () => {
    for (const id of await twittrapiIds()) {
        assertEquals(await estimate(id, inputFor(id)), {
            credits: { default: ENDPOINTS[id].rate },
            evidence: { PAGE: 1 },
        }, id);
    }
});

// ---------------------------------------------------------------------------
// the gates
// ---------------------------------------------------------------------------

Deno.test("twittrapi: every input schema is strict — an unknown key never reaches the wire", async () => {
    for (const id of await twittrapiIds()) {
        const input = inputFor(id);
        await rejects(id, {
            ...input,
            queryParams: { ...input.queryParams, format: "raw" },
        });
        await rejects(id, {
            ...input,
            queryParams: { ...input.queryParams, not_a_param: "1" },
        });
        if (input.pathParams) {
            await rejects(id, {
                ...input,
                pathParams: { ...input.pathParams, extra: "1" },
            });
        }
    }
});

Deno.test("twittrapi gates: search needs searchItem or filters; filters are a closed vocabulary", async () => {
    const id = "twittrapi#search";
    await rejects(id, { queryParams: { count: 5 } });
    await rejects(id, { queryParams: { searchItem: "" } });
    await rejects(id, { queryParams: { searchItem: "x".repeat(513) } });
    await rejects(id, { queryParams: { searchItem: "x", category: "Top10" } });
    await rejects(id, {
        queryParams: { searchItem: "x", filters: { minLikes: 5 } },
    });
    await rejects(id, {
        queryParams: { filters: { sinceTime: "yesterday" } },
    });
    // near twins
    await estimate(id, { queryParams: { filters: { lang: "en" } } });
    await estimate(id, {
        queryParams: { searchItem: "x", category: "People" },
    });
    await estimate(id, {
        queryParams: {
            filters: { hashtags: ["AI"], minimumLikesCount: 10 },
        },
    });
});

Deno.test("twittrapi gates: the id and handle patterns", async () => {
    await rejects("twittrapi#simpletweet/{tweetId}", {
        pathParams: { tweetId: "https://x.com/a/status/1" },
    });
    await rejects("twittrapi#user/by/username/{username}", {
        pathParams: { username: "a" },
    });
    await rejects("twittrapi#user/by/username/{username}", {
        pathParams: { username: "has-dash" },
    });
    await estimate("twittrapi#user/by/username/{username}", {
        pathParams: { username: "@nasa" },
    });
    await rejects("twittrapi#user/{userId}/tweets", {
        pathParams: { userId: "XDevelopers" },
    });
    await rejects("twittrapi#user/users/by/ids", {
        queryParams: { ids: [] },
    });
    await rejects("twittrapi#user/users/by/ids", {
        queryParams: {
            ids: Array.from({ length: 101 }, (_, i) => String(i + 1)),
        },
    });
    await rejects("twittrapi#user/users/by/ids", {
        queryParams: { ids: ["XDevelopers"] },
    });
    await rejects("twittrapi#lists/tweets", {
        queryParams: { listId: "abc" },
    });
    await rejects("twittrapi#trends/{locationId}", {
        pathParams: { locationId: "worldwide" },
    });
    await rejects("twittrapi#tweet/{tweetId}", {
        pathParams: { tweetId: "1" },
        queryParams: { rankingMode: "Newest" },
    });
    await rejects("twittrapi#user/{userId}/followers", {
        pathParams: { userId: "1" },
        queryParams: { count: 2.5 },
    });
});

// ---------------------------------------------------------------------------
// live (gated)
// ---------------------------------------------------------------------------

Deno.test({
    name: "twittrapi live: user/by/username (gated on TWITTRAPI_API_KEY)",
    ignore: liveSkip("twittrapi"),
    fn: async () => {
        const id = "twittrapi#user/by/username/{username}";
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: inputFor(id),
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        // shape, not values: one flat user with a numeric-string id
        const user = (result.output as { data: Record<string, Json> }).data;
        assertEquals(user.username, "XDevelopers");
        assertEquals(typeof user.id, "string");
        assertEquals(result.usage, {
            credits: { default: 0.0001 },
            evidence: { PAGE: 1 },
        });
    },
});
