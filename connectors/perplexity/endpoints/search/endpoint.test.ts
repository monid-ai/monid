import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, type RunInput } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import {
    directTransport,
    Engine,
    EngineError,
    EngineErrorCode,
} from "@monid/connector-engine";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const charge = { credits: { default: 0.005 }, evidence: { CALL: 1 } };
const noCharge = { credits: {}, evidence: {} };

// Real requests recorded 2026-09-22. Response arrays/snippets are trimmed
// using the repository recorder policy; counts in these payloads are not
// the original live result counts. Replay checks shape and settlement.
for (
    const name of [
        "native-defaults",
        "total-token-budget",
        "page-token-budget",
        "both-token-budgets",
        "five-queries",
        "languages-20",
        "people-fifty-no-context",
        "people-fifty-token-budgets",
        "people-50",
        "context-total-conflict",
        "mixed-domain-modes",
        "empty-domain-results",
    ]
) {
    Deno.test(`perplexity#search recorded replay: ${name}`, async () => {
        const fixture = await loadFixture(
            `${fixturesDir}recorded-${name}.json`,
        );
        const call = fixture.calls[0];
        const result = await runEndpoint({
            unit: await testSealedUnit("perplexity#search"),
            input: { body: call.req.body },
            mode: "replay",
            fixture,
        });
        const success = call.res.status >= 200 && call.res.status < 300;
        assertEquals(result.httpStatus, call.res.status);
        assertEquals(result.isProviderError, !success);
        assertEquals(result.output, call.res.body);
        assertEquals(result.usage, success ? charge : noCharge);
        if (success) {
            const output = result.output as Record<string, Json>;
            assertEquals(typeof output.id, "string");
            assert(Array.isArray(output.results));
            for (const item of output.results) {
                const page = item as Record<string, Json>;
                for (const field of ["title", "url", "snippet"]) {
                    assertEquals(typeof page[field], "string");
                }
            }
        }
    });
}

// All local transport tests inject fake credentials and fake fetch. None
// resolves an environment key or performs a network request.
async function capturedEndpoint(
    status = 200,
    output: Json = { id: "synthetic-capture", results: [] },
    params: Record<string, string> = { apiKey: "test-key" },
) {
    const calls: {
        url: string;
        method: string;
        headers: Headers;
        body: Json;
    }[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve(params),
            fetch: (url, init) => {
                calls.push({
                    url: String(url),
                    method: init?.method ?? "GET",
                    headers: new Headers(init?.headers),
                    body: JSON.parse(String(init?.body)),
                });
                return Promise.resolve(
                    new Response(JSON.stringify(output), {
                        status,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit("perplexity#search"));
    return { loaded, calls };
}

for (const name of ["synthetic-search-ok", "synthetic-search-empty"]) {
    Deno.test(`perplexity#search replay: ${name} preserves output and flat charge`, async () => {
        const fixture = await loadFixture(`${fixturesDir}${name}.json`);
        const result = await runEndpoint({
            unit: await testSealedUnit("perplexity#search"),
            input: { body: { query: "public documentation" } },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, charge);
        assertEquals(result.output, fixture.calls[0].res.body);
    });
}

Deno.test("perplexity#search replay: 401 stays data with zero usage", async () => {
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit: await testSealedUnit("perplexity#search"),
        input: { body: { query: "public documentation" } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, noCharge);
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("perplexity#search wire: Bearer auth, attribution, JSON and native optional defaults", async () => {
    const { loaded, calls } = await capturedEndpoint();
    const body = { query: "public documentation" };
    const result = await loaded.run({ body });
    assertEquals(result.usage, charge);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].url, "https://api.perplexity.ai/search");
    assertEquals(calls[0].method, "POST");
    assertEquals(calls[0].headers.get("content-type"), "application/json");
    assertEquals(calls[0].headers.get("authorization"), "Bearer test-key");
    assertEquals(calls[0].headers.get("x-pplx-integration"), "monid");
    assertEquals(
        calls[0].headers.get("user-agent"),
        "monid (+https://monid.ai)",
    );
    assertEquals(calls[0].body, body);
});

Deno.test("perplexity#search wire: all supported filters pass through unchanged", async () => {
    const { loaded, calls } = await capturedEndpoint();
    const body = {
        query: "public documentation",
        country: "US",
        max_results: 20,
        search_type: "web",
        search_context_size: "low",
        search_language_filter: ["en", "fr"],
        search_domain_filter: ["example.com/docs"],
        last_updated_after_filter: "01/01/2026",
        last_updated_before_filter: "09/21/2026",
        search_after_date_filter: "01/01/2025",
        search_before_date_filter: "09/21/2026",
        search_recency_filter: "year",
    };
    await loaded.run({ body });
    assertEquals(calls[0].body, body);
});

const budgetCases: Record<string, Json>[] = [
    { max_tokens: 5000 },
    { max_tokens_per_page: 1000 },
    { max_tokens: 5000, max_tokens_per_page: 1000 },
];
for (const budgets of budgetCases) {
    Deno.test(`perplexity#search wire: budgets ${JSON.stringify(budgets)} never inject context`, async () => {
        const { loaded, calls } = await capturedEndpoint();
        const body = { query: "public documentation", ...budgets };
        await loaded.run({ body });
        assertEquals(calls[0].body, body);
        assert(!("search_context_size" in (calls[0].body as object)));
    });
}

const upstreamValidationCases: Record<string, Json>[] = [
    { query: "test", search_context_size: "high", max_tokens: 5000 },
    {
        query: "test",
        search_context_size: "low",
        max_tokens_per_page: 1000,
    },
    { query: "test", search_type: "web", max_results: 21 },
    { query: "test", max_results: 21 },
    {
        query: "test",
        search_domain_filter: ["example.com", "-example.org"],
    },
];
for (const body of upstreamValidationCases) {
    Deno.test(`perplexity#search cross-field passthrough with simulated 422: ${JSON.stringify(body)}`, async () => {
        // The fake upstream illustrates a validation error. It does NOT
        // claim to verify the live vendor's error text/status for this case.
        const output = { detail: "Synthetic upstream validation failure" };
        const { loaded, calls } = await capturedEndpoint(422, output);
        const result = await loaded.run({ body });
        assertEquals(calls[0].body, body);
        assertEquals(result.httpStatus, 422);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, noCharge);
        assertEquals(result.output, output);
    });
}

for (
    const query of [
        "single query",
        ["one query"],
        ["one", "two", "three", "four", "five"],
    ]
) {
    Deno.test(`perplexity#search: ${JSON.stringify(query)} is one estimated and settled call`, async () => {
        const input = { body: { query } };
        assertEquals(
            await estimateEndpoint(
                await testSealedUnit("perplexity#search"),
                input,
            ),
            charge,
        );
        const { loaded, calls } = await capturedEndpoint();
        const result = await loaded.run(input);
        assertEquals(calls.length, 1);
        assertEquals(calls[0].body, input.body);
        assertEquals(result.usage, charge);
    });
}

Deno.test("perplexity#search: people mode permits 50 results", async () => {
    const { loaded, calls } = await capturedEndpoint();
    const body = { query: "test", search_type: "people", max_results: 50 };
    await loaded.run({ body });
    assertEquals(calls[0].body, body);
});

const invalidBodies: [string, Record<string, Json>][] = [
    ["missing query", {}],
    ["wrong query type", { query: 1 }],
    ["wrong query item", { query: ["valid", 1] }],
    ["six queries", { query: ["a", "b", "c", "d", "e", "f"] }],
    ["zero results", { query: "test", max_results: 0 }],
    ["51 results", { query: "test", max_results: 51 }],
    ["fractional results", { query: "test", max_results: 1.5 }],
    ["invalid mode", { query: "test", search_type: "images" }],
    ["invalid context", { query: "test", search_context_size: "huge" }],
    ["zero tokens", { query: "test", max_tokens: 0 }],
    ["too many tokens", { query: "test", max_tokens: 1_000_001 }],
    ["fractional tokens", { query: "test", max_tokens_per_page: 1.5 }],
    ["too many page tokens", { query: "test", max_tokens_per_page: 1_000_001 }],
    ["invalid country length", { query: "test", country: "USA" }],
    ["invalid language length", {
        query: "test",
        search_language_filter: ["eng"],
    }],
    ["21 languages", {
        query: "test",
        search_language_filter: Array(21).fill("en"),
    }],
    ["21 domains", {
        query: "test",
        search_domain_filter: Array(21).fill("example.com"),
    }],
    ["long domain", { query: "test", search_domain_filter: ["a".repeat(254)] }],
    ["invalid recency", { query: "test", search_recency_filter: "decade" }],
];

for (const [name, body] of invalidBodies) {
    Deno.test(`perplexity#search compiled validation: ${name} never reaches transport`, async () => {
        const { loaded, calls } = await capturedEndpoint();
        const error = await assertRejects(
            () => loaded.run({ body }),
            EngineError,
        );
        assertEquals(error.code, EngineErrorCode.INVALID_INPUT);
        assertEquals(calls.length, 0);
    });
}

for (const status of [400, 401, 403, 422, 429, 500, 503]) {
    Deno.test(`perplexity#search wire: HTTP ${status} preserves errors, zero charge, no retry`, async () => {
        const output = { error: `Synthetic HTTP ${status}` };
        const { loaded, calls } = await capturedEndpoint(status, output);
        const result = await loaded.run({ body: { query: "test" } });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.output, output);
        assertEquals(result.usage, noCharge);
        assertEquals(calls.length, 1);
    });
}

Deno.test("perplexity#search: missing credentials fail locally without fetch", async () => {
    const { loaded, calls } = await capturedEndpoint(200, {}, {});
    const error = await assertRejects(
        () => loaded.run({ body: { query: "test" } }),
        EngineError,
    );
    assertEquals(error.code, EngineErrorCode.MISSING_CREDENTIAL);
    assertEquals(calls.length, 0);
});

for (const failure of ["network", "abort"]) {
    Deno.test(`perplexity#search: ${failure} is retriable execution failure, not free success`, async () => {
        let attempts = 0;
        const loaded = await new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: () => {
                    attempts++;
                    return Promise.reject(
                        failure === "abort"
                            ? new DOMException("Synthetic abort", "AbortError")
                            : new TypeError("Synthetic network failure"),
                    );
                },
            }),
        }).load(await testSealedUnit("perplexity#search"));
        const error = await assertRejects(
            () => loaded.run({ body: { query: "test" } }),
            EngineError,
        );
        assertEquals(error.code, EngineErrorCode.EXECUTION_FAILED);
        assertEquals(error.retriable, true);
        assertEquals(attempts, 1);
    });
}

Deno.test("perplexity#search compiled contract: no injected defaults or secrets", async () => {
    const unit = await testSealedUnit("perplexity#search");
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        Record<string, Json>
    >;
    assertEquals(Object.keys(properties).length, 14);
    for (const field of Object.values(properties)) {
        assert(!("default" in field));
    }
    assertEquals(unit.doc.request.url, "https://api.perplexity.ai/search");
    assert(!JSON.stringify(unit).includes("test-key"));
});

Deno.test({
    name: "perplexity#search live (explicit opt-in plus provider credentials)",
    ignore: Deno.env.get("PERPLEXITY_LIVE_TESTS") !== "1" ||
        liveSkip("perplexity"),
    fn: async () => {
        const input: RunInput = {
            body: {
                query: "Deno documentation",
                max_results: 2,
                search_context_size: "low",
            },
        };
        const result = await runEndpoint({
            unit: await testSealedUnit("perplexity#search"),
            input,
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, charge);
        const output = result.output as Record<string, Json>;
        assertEquals(typeof output.id, "string");
        assert(Array.isArray(output.results));
        for (const item of output.results) {
            const page = item as Record<string, Json>;
            assertEquals(typeof page.title, "string");
            assertEquals(typeof page.url, "string");
            assertEquals(typeof page.snippet, "string");
        }
    },
});
