import {
    assert,
    assertAlmostEquals,
    assertEquals,
    assertRejects,
} from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    estimateEndpoint,
    type Fixture,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const inputs: Record<string, Record<string, Json>> = {
    search: { query: "quantum error correction", max_num_results: 2 },
    contents: {
        urls: ["https://example.com", "https://example.org"],
        summary: true,
    },
};

function responseBody(fixture: Fixture): Record<string, Json> {
    return fixture.calls[0].res.body as Record<string, Json>;
}

Deno.test("valyu: two catalog endpoints, one auth and dollar meter", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("valyu#")
    ).sort();
    assertEquals(ids, ["valyu#v1/contents", "valyu#v1/search"]);
    const search = bundle.endpoints["valyu#v1/search"];
    const contents = bundle.endpoints["valyu#v1/contents"];
    assertEquals(search.auth.inject.$fn.key, contents.auth.inject.$fn.key);
    assertEquals(
        search.usage.consolidate?.$fn.key,
        contents.usage.consolidate?.$fn.key,
    );
    assertEquals(
        search.usage.evidence.$fn.key,
        contents.usage.evidence.$fn.key,
    );
    for (const endpoint of ["search", "contents"]) {
        const doc = bundle.endpoints[`valyu#v1/${endpoint}`];
        assertEquals(doc.request.method, "POST");
        assertEquals(doc.request.url, `https://api.valyu.ai/v1/${endpoint}`);
        assertEquals(doc.usage.credits, { default: { label: "US dollars" } });
        assertEquals(doc.usage.model.kind, "PER_UNIT");
        assertEquals(
            "consumes" in doc.usage.model && doc.usage.model.consumes,
            { credit: "default", amount: 0.000000001 },
        );
    }
});

for (const endpoint of ["search", "contents"]) {
    Deno.test(`valyu#v1/${endpoint}: actual wire auth and JSON; receipt stripped exactly`, async () => {
        const unit = await testSealedUnit(`valyu#v1/${endpoint}`);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-${endpoint}-ok.json`,
        );
        let calls = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: (url, init) => {
                    calls++;
                    assertEquals(
                        String(url),
                        `https://api.valyu.ai/v1/${endpoint}`,
                    );
                    assertEquals(init?.method, "POST");
                    const headers = new Headers(init?.headers);
                    assertEquals(headers.get("x-api-key"), "test-key");
                    assertEquals(headers.get("authorization"), null);
                    assertEquals(
                        headers.get("content-type"),
                        "application/json",
                    );
                    assertEquals(
                        JSON.parse(String(init?.body)),
                        inputs[endpoint],
                    );
                    return Promise.resolve(
                        Response.json(fixture.calls[0].res.body),
                    );
                },
            }),
        });
        const loaded = await engine.load(unit);
        const result = await loaded.run({ body: inputs[endpoint] });
        assertEquals(calls, 1);
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        const cost = endpoint === "search" ? 0.0075 : 0.004;
        assertEquals(result.usage, {
            credits: { default: cost },
            evidence: { CREDIT: Math.round(cost * 1_000_000_000) },
        });
        const output = result.output as Record<string, Json>;
        const receipt = endpoint === "search"
            ? "total_deduction_dollars"
            : "total_cost_dollars";
        const expected = { ...responseBody(fixture) };
        delete expected[receipt];
        assertEquals(output, expected);
        assertEquals(receipt in output, false);
        assertEquals(
            (output.results as Record<string, Json>[])[0].price,
            endpoint === "search" ? 0.005 : 0.002,
        );
    });

    Deno.test(`valyu#v1/${endpoint}: missing receipt derives per-result prices; zero wins`, async () => {
        const unit = await testSealedUnit(`valyu#v1/${endpoint}`);
        const receipt = endpoint === "search"
            ? "total_deduction_dollars"
            : "total_cost_dollars";
        for (const reported of [undefined, 0, 0.0000004]) {
            const fixture = await loadFixture(
                `${fixturesDir}synthetic-${endpoint}-ok.json`,
            );
            const body = responseBody(fixture);
            if (reported === undefined) delete body[receipt];
            else body[receipt] = reported;
            const result = await runEndpoint({
                unit,
                input: { body: inputs[endpoint] },
                mode: "replay",
                fixture,
            });
            const cost = reported ?? (endpoint === "search" ? 0.0075 : 0.004);
            if (cost > 0) {
                assertAlmostEquals(result.usage.credits.default, cost, 1e-9);
            } else {
                assertEquals(result.usage.credits, {});
            }
            assertEquals(result.usage.evidence, {
                CREDIT: Math.round(cost * 1_000_000_000),
            });
        }
    });

    Deno.test(`valyu#v1/${endpoint}: HTTP provider errors never bill`, async () => {
        const unit = await testSealedUnit(`valyu#v1/${endpoint}`);
        for (const status of [400, 401, 402, 403, 429, 500]) {
            const fixture = await loadFixture(
                `${fixturesDir}synthetic-provider-error.json`,
            );
            fixture.calls[0].res.status = status;
            const result = await runEndpoint({
                unit,
                input: { body: inputs[endpoint] },
                mode: "replay",
                fixture,
            });
            assertEquals(result.httpStatus, status);
            assertEquals(result.isProviderError, true);
            assertEquals(result.usage, { credits: {}, evidence: {} });
            assertEquals(result.output, fixture.calls[0].res.body);
        }
    });

    Deno.test(`valyu#v1/${endpoint}: invalid cost receipt fails closed`, async () => {
        const unit = await testSealedUnit(`valyu#v1/${endpoint}`);
        for (const receipt of [-1, "0.01", null]) {
            const fixture = await loadFixture(
                `${fixturesDir}synthetic-${endpoint}-ok.json`,
            );
            const key = endpoint === "search"
                ? "total_deduction_dollars"
                : "total_cost_dollars";
            responseBody(fixture)[key] = receipt;
            await assertRejects(
                () =>
                    runEndpoint({
                        unit,
                        input: { body: inputs[endpoint] },
                        mode: "replay",
                        fixture,
                    }),
                Error,
                "FN_CONTRACT",
            );
        }
    });
}

Deno.test("valyu#v1/search: partial and empty results preserve warnings and actual cost", async () => {
    const unit = await testSealedUnit("valyu#v1/search");
    for (const empty of [false, true]) {
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-search-ok.json`,
        );
        fixture.calls[0].res.status = 206;
        const body = responseBody(fixture);
        body.error = "Some sources could not be searched";
        body.warnings = ["Source unavailable"];
        if (empty) {
            body.results = [];
            body.total_deduction_dollars = 0;
            body.results_by_source = {};
            body.total_characters = 0;
        }
        const result = await runEndpoint({
            unit,
            input: { body: inputs.search },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 206);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage.credits, empty ? {} : { default: 0.0075 });
        assertEquals(
            (result.output as Record<string, Json>).warnings,
            body.warnings,
        );
    }
});

Deno.test("valyu#v1/contents: partial success charges only successful URLs; 422 bills zero", async () => {
    const unit = await testSealedUnit("valyu#v1/contents");
    for (const receiptPresent of [true, false]) {
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-contents-partial.json`,
        );
        const body = responseBody(fixture);
        if (!receiptPresent) {
            delete body.total_cost_dollars;
            // A failed URL's price must never become fallback usage.
            (body.results as Record<string, Json>[])[1].price = 1;
        }
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    urls: [
                        "https://example.com",
                        "https://example.org/unavailable",
                    ],
                },
            },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 206);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, {
            credits: { default: 0.001 },
            evidence: { CREDIT: 1_000_000 },
        });
        assertEquals((result.output as Record<string, Json>).urls_failed, 1);
    }
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-contents-partial.json`,
    );
    fixture.calls[0].res.status = 422;
    const body = responseBody(fixture);
    body.success = false;
    body.urls_processed = 0;
    body.urls_failed = 2;
    body.results = [
        { url: "https://example.com", status: "failed", error: "Unavailable" },
        {
            url: "https://example.org/unavailable",
            status: "failed",
            error: "Unavailable",
        },
    ];
    body.total_cost_dollars = 0;
    const result = await runEndpoint({
        unit,
        input: { body: inputs.contents },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, body);
});

Deno.test("valyu: Search has no fabricated quote; Contents estimates deduplicated URLs", async () => {
    const search = await testSealedUnit("valyu#v1/search");
    assertEquals(
        await estimateEndpoint(search, {
            body: { query: "x", max_price: 20, response_length: "max" },
        }),
        { credits: {}, evidence: {} },
    );
    const contents = await testSealedUnit("valyu#v1/contents");
    for (
        const summary of [undefined, false, true, "Summarize", "", {
            type: "object",
            properties: { name: { type: "string" } },
        }]
    ) {
        const body = {
            urls: [
                "https://example.com",
                "https://example.org",
                "https://example.com",
            ],
            ...(summary !== undefined ? { summary } : {}),
        };
        const withSummary = summary !== undefined && summary !== false;
        const cost = withSummary ? 0.004 : 0.002;
        assertEquals(await estimateEndpoint(contents, { body }), {
            credits: { default: cost },
            evidence: { CREDIT: withSummary ? 4_000_000 : 2_000_000 },
        });
    }
});

Deno.test("valyu#v1/search: compiled schema bounds, filters, historical cache", async () => {
    const unit = await testSealedUnit("valyu#v1/search");
    const bad: Json[] = [
        {},
        { query: "" },
        { query: "x", max_num_results: 0 },
        { query: "x", max_num_results: 21 },
        { query: "x", max_num_results: 1.5 },
        { query: "x", max_price: 0 },
        { query: "x", relevance_threshold: 1.1 },
        { query: "x", search_type: "academic" },
        { query: "x", response_length: 0 },
        { query: "x", response_length: "tiny" },
        { query: "x", instructions: "x".repeat(501) },
        { query: "x", country_code: "United States" },
        { query: "x", source_biases: { "example.com": 6 } },
        { query: "x", historical_cache: "only" },
        { query: "x", historical_cache_strict: "strict" },
        { query: "x", start_date: "yesterday" },
        { query: "x", async: true },
    ];
    for (const body of bad) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    const good: Json[] = [
        { query: "x" },
        { query: "x", max_num_results: 1 },
        { query: "x", max_num_results: 20 },
        {
            query: "x",
            response_length: 1,
            relevance_threshold: 0,
            source_biases: null,
        },
        {
            query: "x",
            response_length: "max",
            source_biases: { "example.com": -5 },
            instructions: "x".repeat(500),
        },
        {
            query: "x",
            historical_cache: true,
            historical_cache_strict: "only",
            start_date: "2026-01-01T12:30:00Z",
            end_date: "2026-01-02T12:30:00+01:00",
        },
        {
            query: "x",
            search_type: "proprietary",
            included_sources: ["valyu/valyu-pubmed"],
            excluded_sources: [],
            include_abstracts: true,
        },
        {
            query: "x",
            search_type: "news",
            country_code: "US",
            start_date: "2026-01-01",
            end_date: "2026-02-01",
            url_only: true,
        },
        {
            query: "x",
            search_type: "web",
            fast_mode: true,
            is_tool_call: false,
            max_price: 20,
        },
    ];
    for (const body of good) {
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-search-ok.json`,
        );
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false, JSON.stringify(body));
    }
});

Deno.test("valyu#v1/contents: compiled schema is sync-only, bounded, and strict", async () => {
    const unit = await testSealedUnit("valyu#v1/contents");
    const urls = ["https://example.com"];
    const bad: Json[] = [
        {},
        { urls: [] },
        { urls: ["not-a-url"] },
        { urls: ["ftp://example.com"] },
        { urls: ["https://"] },
        { urls: ["https://not a host"] },
        { urls: Array(11).fill("https://example.com") },
        { urls, async: true },
        { urls, webhook_url: "https://example.com/webhook" },
        { urls, unknown_option: true },
        { urls, summary: "x".repeat(501) },
        { urls, summary: 1 },
        { urls, extract_effort: "low" },
        { urls, max_price_dollars: 0 },
        { urls, response_length: 0 },
    ];
    for (const body of bad) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    const good: Json[] = [
        { urls },
        { urls, async: false },
        { urls: Array(10).fill("http://example.com") },
        { urls, summary: false, response_length: "max" },
        { urls, summary: true },
        {
            urls,
            summary: "x".repeat(500),
            extract_effort: "high",
            screenshot: true,
        },
        {
            urls,
            summary: {
                type: "object",
                properties: { title: { type: "string" } },
                required: ["title"],
            },
            max_price_dollars: 0.1,
            response_length: 1,
        },
    ];
    for (const body of good) {
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-contents-ok.json`,
        );
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false, JSON.stringify(body));
    }
});

for (const endpoint of ["search", "contents"]) {
    Deno.test({
        name: `valyu#v1/${endpoint} live (gated on VALYU_API_KEY)`,
        ignore: liveSkip("valyu"),
        fn: async () => {
            const unit = await testSealedUnit(`valyu#v1/${endpoint}`);
            const body: Json = endpoint === "search"
                ? {
                    query: "Deno TypeScript runtime",
                    search_type: "web",
                    max_num_results: 1,
                }
                : { urls: ["https://example.com"] };
            const result = await runEndpoint({
                unit,
                input: { body },
                mode: "live",
            });
            assertEquals(result.isProviderError, false);
            const output = result.output as Record<string, Json>;
            assert(Array.isArray(output.results));
            assertEquals("total_deduction_dollars" in output, false);
            assertEquals("total_cost_dollars" in output, false);
            assertEquals(typeof result.usage.evidence.CREDIT, "number");
        },
    });
}
