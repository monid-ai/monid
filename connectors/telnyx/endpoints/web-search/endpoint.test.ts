import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const ID = "telnyx#web_search";
const fixtures = fromFileUrl(new URL("./fixtures/", import.meta.url));

// "$5 per 1,000 calls", https://telnyx.com/products/web-search-api FAQ,
// checked 2026-10-22. Empty/error runs bill 0 (no cost receipt to claim).
const PER_SEARCH = 0.005;

Deno.test(`${ID}: compiled surface — POST v2 URL, PER_UNIT $0.005, no consolidate`, async () => {
    const bundle = await testBundle();
    const doc = bundle.endpoints[ID];
    assertEquals(doc.request.method, "POST");
    assertEquals(doc.request.url, "https://api.telnyx.com/v2/web_search");
    assertEquals(doc.meta.categories, ["web-search"]);
    assertEquals(doc.usage.consolidate, undefined);
    assertEquals(Object.keys(doc.usage.credits), ["default"]);
    assertEquals(doc.timeouts.requestMs, 30_000);
    assertEquals(doc.timeouts.runMs, 30_000);
    const model = doc.usage.model;
    assertEquals(model.kind, "PER_UNIT");
    assertEquals("unit" in model ? model.unit : undefined, "RESULT");
    assertEquals(
        "consumes" in model ? model.consumes : undefined,
        { credit: "default", amount: PER_SEARCH },
    );
});

for (const name of ["happy", "default-count"]) {
    Deno.test(`${ID} ${name} (recorded): whole usage, raw envelope preserved`, async () => {
        const unit = await testSealedUnit(ID);
        const fixture = await loadFixture(`${fixtures}${name}.json`);
        const result = await runEndpoint({
            unit,
            input: { body: fixture.calls[0].req.body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, {
            credits: { default: PER_SEARCH },
            evidence: { RESULT: 1 },
        });
        // Fixture trimming retains two of the live results, not the whole count.
        assertEquals(result.output, fixture.calls[0].res.body);
        const output = result.output as { data: { results: { web: Json[] } } };
        assertEquals(output.data.results.web.length, 2);
    });
}

Deno.test(`${ID} empty (recorded): web [] bills the Monid buyer 0`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixtures}empty.json`);
    const result = await runEndpoint({
        unit,
        input: { body: fixture.calls[0].req.body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    assertEquals(result.output, { data: { results: { web: [] } } });
});

for (
    const [name, status] of [["provider-error", 400], [
        "missing-auth",
        401,
    ]] as const
) {
    Deno.test(`${ID} ${name} (recorded ${status}): data, zero usage`, async () => {
        const unit = await testSealedUnit(ID);
        const fixture = await loadFixture(`${fixtures}${name}.json`);
        const result = await runEndpoint({
            unit,
            input: { body: fixture.calls[0].req.body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, fixture.calls[0].res.body);
    });
}

Deno.test(`${ID} nullable news/images (synthetic): no destructive normalization`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixtures}synthetic-nullable-news.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: fixture.calls[0].req.body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.usage, {
        credits: { default: PER_SEARCH },
        evidence: { RESULT: 1 },
    });
});

Deno.test(`${ID} native request: bearer, URL, JSON body, no implicit defaults`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixtures}happy.json`);
    const body = {
        query: "ocean tides",
        count: 3,
        country: "US",
        safesearch: "moderate",
        freshness: "month",
        include_domains: ["noaa.gov"],
        livecrawl: false,
    };
    let requests = 0;
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-only-telnyx-key" }),
            fetch: (url, init) => {
                requests++;
                assertEquals(
                    String(url),
                    "https://api.telnyx.com/v2/web_search",
                );
                assertEquals(init?.method, "POST");
                assertEquals(init?.redirect, "manual");
                const headers = new Headers(init?.headers);
                assertEquals(
                    headers.get("authorization"),
                    "Bearer test-only-telnyx-key",
                );
                assertEquals(headers.get("content-type"), "application/json");
                assertEquals(JSON.parse(String(init?.body)), body);
                return Promise.resolve(
                    new Response(JSON.stringify(fixture.calls[0].res.body), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    }).load(unit);
    const result = await loaded.run({ body });
    assertEquals(requests, 1);
    assertEquals(result.output, fixture.calls[0].res.body);
    assertEquals(result.usage, {
        credits: { default: PER_SEARCH },
        evidence: { RESULT: 1 },
    });
});

Deno.test(`${ID} estimate: one search regardless of result cap`, async () => {
    const unit = await testSealedUnit(ID);
    const bodies: Json[] = [
        { query: "x" },
        { query: "x", count: 1 },
        { query: "x", count: 100 },
    ];
    for (const body of bodies) {
        assertEquals(await estimateEndpoint(unit, { body }), {
            credits: { default: PER_SEARCH },
            evidence: { RESULT: 1 },
        });
    }
});

Deno.test(`${ID} schema gate: vendor bounds + local strict body, with passing near-twins`, async () => {
    const unit = await testSealedUnit(ID);
    const rejected: Json[] = [
        {},
        { query: "" },
        { query: "x".repeat(2001) },
        { query: "x", count: -1 },
        { query: "x", count: 0 },
        { query: "x", count: 101 },
        { query: "x", count: 2.5 },
        { query: "x", country: "USA" },
        { query: "x", safesearch: "high" },
        { query: "x", freshness: "x".repeat(21) },
        { query: "x", include_domains: Array(51).fill("a.com") },
        { query: "x", exclude_domains: Array(51).fill("a.com") },
        { query: "x", livecrawl: "true" },
        { query: "x", numResults: 2 },
    ];
    for (const body of rejected) {
        // No fixture: any transport call fails, so INVALID_INPUT must be pre-wire.
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    const passing: Json[] = [
        { query: "x" },
        { query: "x".repeat(2000) },
        { query: "x", count: 1 },
        { query: "x", count: 100 },
        { query: "x", country: "US" },
        { query: "x", safesearch: "off" },
        { query: "x", safesearch: "moderate" },
        { query: "x", safesearch: "strict" },
        ...["day", "week", "month", "year"].map((freshness) => ({
            query: "x",
            freshness,
        })),
        { query: "x", include_domains: Array(50).fill("a.com") },
        { query: "x", exclude_domains: Array(50).fill("a.com") },
        { query: "x", livecrawl: true },
    ];
    for (const body of passing) {
        assertEquals(await estimateEndpoint(unit, { body }), {
            credits: { default: PER_SEARCH },
            evidence: { RESULT: 1 },
        });
    }
});

Deno.test({
    name: `${ID} live (gated on TELNYX_API_KEY)`,
    ignore: liveSkip("telnyx"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { body: { query: "telnyx sip trunking", count: 2 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
        const output = result.output as { data: { results: { web: unknown } } };
        assertEquals(Array.isArray(output.data.results.web), true);
    },
});

Deno.test(`${ID} malformed 2xx (synthetic): missing or non-array meter fails closed`, async () => {
    const unit = await testSealedUnit(ID);
    const bodies: Json[] = [
        null,
        {},
        [],
        "not JSON",
        "{broken",
        "",
        { data: null },
        { data: [] },
        { data: {} },
        { data: { results: null } },
        { data: { results: [] } },
        { data: { results: {} } },
        ...[null, {}, "", "results", 0, false].map((web) => ({
            data: { results: { web } },
        })),
        { error: { message: "failure with incorrect HTTP 200" } },
    ];
    for (const body of bodies) {
        let requests = 0;
        const loaded = await new Engine({
            transport: directTransport({
                params: () =>
                    Promise.resolve({ apiKey: "test-only-telnyx-key" }),
                fetch: () => {
                    requests++;
                    return Promise.resolve(
                        new Response(
                            typeof body === "string"
                                ? body
                                : JSON.stringify(body),
                            { status: 200 },
                        ),
                    );
                },
            }),
        }).load(unit);
        const error = await assertRejects(
            () => loaded.run({ body: { query: "x" } }),
            Error,
            "FN_CONTRACT",
            JSON.stringify(body),
        );
        assertEquals("retriable" in error && error.retriable, false);
        assertEquals(requests, 1);
    }
});

Deno.test(`${ID} settle (synthetic): result-array size never multiplies the search charge`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixtures}happy.json`);
    const sample = (fixture.calls[0].res.body as {
        data: { results: { web: Json[] } };
    }).data.results.web[0];
    for (const size of [0, 1, 3, 10, 100]) {
        const output = { data: { results: { web: Array(size).fill(sample) } } };
        let requests = 0;
        const loaded = await new Engine({
            transport: directTransport({
                params: () =>
                    Promise.resolve({ apiKey: "test-only-telnyx-key" }),
                fetch: () => {
                    requests++;
                    return Promise.resolve(
                        new Response(JSON.stringify(output)),
                    );
                },
            }),
        }).load(unit);
        // Deliberately returns more than the cap: neither truncate nor per-result bill.
        const result = await loaded.run({ body: { query: "x", count: 1 } });
        assertEquals(result.usage, {
            credits: size > 0 ? { default: PER_SEARCH } : {},
            evidence: { RESULT: size > 0 ? 1 : 0 },
        });
        assertEquals(result.output, output);
        assertEquals(requests, 1);
        assertEquals(result.timing.attempts, 0); // Native sync timing; fetch count is above.
    }
});

Deno.test(`${ID} HTTP failures (synthetic): Retry-After/5xx/redirect are data, never retried`, async () => {
    const unit = await testSealedUnit(ID);
    const cases: {
        status: number;
        body: string;
        headers?: Record<string, string>;
    }[] = [
        {
            status: 429,
            body: '{"errors":[{"code":"10011","title":"Too many requests"}]}',
            headers: { "retry-after": "2" },
        },
        {
            status: 429,
            body: '{"error":{"message":"Rate limited"}}',
            headers: { "retry-after": "Wed, 21 Oct 2099 07:28:00 GMT" },
        },
        { status: 500, body: '{"error":{"message":"Internal server error"}}' },
        { status: 502, body: "<html>Bad gateway</html>" },
        { status: 503, body: "{broken" },
        { status: 504, body: "" },
        {
            status: 302,
            body: "",
            headers: { location: "https://other.invalid/" },
        },
    ];
    for (const item of cases) {
        let requests = 0;
        const loaded = await new Engine({
            sleep: () => {
                throw new Error("sync POST must not back off or retry");
            },
            transport: directTransport({
                params: () =>
                    Promise.resolve({ apiKey: "test-only-telnyx-key" }),
                fetch: (_url, init) => {
                    requests++;
                    assertEquals(init?.redirect, "manual");
                    return Promise.resolve(
                        new Response(item.body, {
                            status: item.status,
                            headers: item.headers,
                        }),
                    );
                },
            }),
        }).load(unit);
        const result = await loaded.run({ body: { query: "x" } });
        let expected: Json = item.body || null;
        try {
            expected = JSON.parse(item.body);
        } catch { /* native sniff-decode */ }
        assertEquals(result.httpStatus, item.status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.output, expected);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(requests, 1);
        assertEquals(result.timing.attempts, 0); // Native sync timing; fetch count is above.
    }
});

Deno.test(`${ID} transport failures (synthetic): reject without settlement or POST replay`, async () => {
    const unit = await testSealedUnit(ID);
    for (const stage of ["connect", "body", "abort"]) {
        let requests = 0;
        const loaded = await new Engine({
            transport: directTransport({
                params: () =>
                    Promise.resolve({ apiKey: "test-only-telnyx-key" }),
                fetch: () => {
                    requests++;
                    if (stage === "connect") {
                        return Promise.reject(
                            new TypeError("synthetic connection reset"),
                        );
                    }
                    if (stage === "abort") {
                        return Promise.reject(
                            new DOMException("synthetic abort", "AbortError"),
                        );
                    }
                    return Promise.resolve(
                        new Response(
                            new ReadableStream({
                                start(controller) {
                                    controller.error(
                                        new TypeError("synthetic body dropped"),
                                    );
                                },
                            }),
                        ),
                    );
                },
            }),
        }).load(unit);
        const error = await assertRejects(
            () => loaded.run({ body: { query: "x" } }),
            Error,
            "EXECUTION_FAILED",
        );
        // Retriable classification is NOT an automatic retry, nor safe billing replay.
        assertEquals("retriable" in error && error.retriable, true);
        assertEquals(requests, 1);
    }
});

Deno.test(`${ID} missing local credential: reject before any transport request`, async () => {
    const unit = await testSealedUnit(ID);
    let requests = 0;
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({}),
            fetch: () => {
                requests++;
                throw new Error("must not reach wire");
            },
        }),
    }).load(unit);
    await assertRejects(
        () => loaded.run({ body: { query: "x" } }),
        Error,
        "MISSING_CREDENTIAL",
    );
    assertEquals(requests, 0);
});

Deno.test(`${ID} schema fidelity: type/null boundaries and documented permissive near-twins`, async () => {
    const unit = await testSealedUnit(ID);
    const rejected: Json[] = [
        null,
        [],
        { query: null },
        { query: 1 },
        { query: "x", count: "1" },
        { query: "x", count: null },
        { query: "x", country: "U" },
        { query: "x", country: null },
        { query: "x", include_domains: "example.com" },
        { query: "x", include_domains: [null] },
        { query: "x", exclude_domains: [1] },
        { query: "x", freshness: null },
        { query: "x", url: "http://127.0.0.1/" },
        { query: "x", baseUrl: "https://other.invalid" },
    ];
    for (const body of rejected) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
    const passing: Json[] = [
        { query: "x", country: "us" },
        { query: "x", country: "12" },
        { query: "x", freshness: "" },
        { query: "x", freshness: "custom" },
        { query: "x", include_domains: [] },
        { query: "x", include_domains: [""] },
        { query: "x", exclude_domains: ["http://127.0.0.1/"] },
        {
            query: "x",
            include_domains: ["example.com"],
            exclude_domains: ["other.example"],
        },
    ];
    // Vendor mirror has length/type bounds, NOT ISO membership/hostname regexes.
    // Cross-field rejection belongs to the vendor, not an invented local refine.
    for (const body of passing) {
        assertEquals(await estimateEndpoint(unit, { body }), {
            credits: { default: PER_SEARCH },
            evidence: { RESULT: 1 },
        });
    }
});

Deno.test(`${ID} fixed-origin transport (synthetic): query/filter URLs are data, not fetch targets`, async () => {
    const unit = await testSealedUnit(ID);
    const body = {
        query: "http://169.254.169.254/latest/meta-data",
        include_domains: ["http://127.0.0.1/"],
    };
    let requests = 0;
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-only-telnyx-key" }),
            fetch: (url, init) => {
                requests++;
                const target = new URL(String(url));
                assertEquals(target.origin, "https://api.telnyx.com");
                assertEquals(target.pathname, "/v2/web_search");
                assertEquals(
                    target.searchParams.get("url"),
                    "https://other.invalid/",
                );
                assertEquals(init?.redirect, "manual");
                assertEquals(JSON.parse(String(init?.body)), body);
                return Promise.resolve(
                    new Response('{"data":{"results":{"web":[]}}}'),
                );
            },
        }),
    }).load(unit);
    // Generic RunInput permits query params; they cannot replace the compiled origin.
    const result = await loaded.run({
        body,
        queryParams: { url: "https://other.invalid/" },
        pathParams: { url: "https://other.invalid/" },
    });
    assertEquals(requests, 1);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});
