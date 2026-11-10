import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

const post = {
    url: "https://jsonplaceholder.typicode.com/posts",
    method: "POST",
    body: { title: "widget", body: "one widget", userId: 1 },
};

Deno.test("string#request happy: a POST settles at the request-standard line", async () => {
    const unit = await testSealedUnit("string#request");
    const fixture = await loadFixture(
        `${fixturesDir}request-post.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: post },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.0002 },
        evidence: { request_standard: 1 },
    });
    // the destination's own status rides inside String's 200 envelope
    const output = result.output as Record<string, unknown>;
    assertEquals(output.statusCode, 201);
    assertEquals((output.data as Record<string, unknown>).id, 101);
});

Deno.test("string#request happy: request_premium settles at the premium line, not the standard-line estimate", async () => {
    const unit = await testSealedUnit("string#request");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-request-premium.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: post },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.002 },
        evidence: { request_premium: 1 },
    });
    assertEquals(
        await estimateEndpoint(unit, { body: post }),
        { credits: { default: 0.0002 }, evidence: { request_standard: 1 } },
    );
});

Deno.test("string#request: a billed type outside its own lines settles zero usage", async () => {
    // a browser path never carries a body, so browser_premium cannot be
    // this endpoint's line: the shared evidence fn bills only the lines
    // of the doc it runs in
    const unit = await testSealedUnit("string#request");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-browser-premium.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: post },
        mode: "replay",
        fixture,
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("string#request provider error (synthetic 502): zero usage", async () => {
    const unit = await testSealedUnit("string#request");
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-fetch-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: { body: post },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 502);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("string#request: a call goes out as JSON with challenge solving off", async () => {
    const sent: unknown[] = [];
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_input, init) => {
                sent.push(JSON.parse(String(init?.body)));
                return Promise.resolve(
                    new Response(JSON.stringify({ statusCode: 201 }), {
                        status: 200,
                        headers: {
                            "content-type": "application/json",
                            "x-billed-request-type": "request_standard",
                        },
                    }),
                );
            },
        }),
    }).load(await testSealedUnit("string#request"));
    await loaded.run({ body: post });
    assertEquals(sent, [{ ...post, format: "json", solveCaptcha: false }]);
});

Deno.test("string#request: POST, PUT or PATCH only, and no browser fields", async () => {
    const unit = await testSealedUnit("string#request");
    const fixture = await loadFixture(
        `${fixturesDir}request-post.json`,
    );
    const rejected: Json[] = [
        { url: "https://jsonplaceholder.typicode.com/posts" },
        { url: "https://jsonplaceholder.typicode.com/posts", method: "GET" },
        { url: "https://jsonplaceholder.typicode.com/posts", method: "DELETE" },
        { url: "https://jsonplaceholder.typicode.com/posts", method: "HEAD" },
        { url: "https://jsonplaceholder.typicode.com/posts", method: "post" },
        { method: "POST" },
        { ...post, url: "ftp://example.test/file" },
        { ...post, executeJS: true },
        { ...post, actions: [{ type: "wait" }] },
        { ...post, body: "x".repeat(1_000_001) },
        { ...post, notAField: true },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body).slice(0, 120),
        );
    }
    // near-valid twins: each method, a string body at its cap, and every
    // other exposed field
    const accepted: Json[] = [
        { ...post, method: "PUT" },
        { ...post, method: "PATCH" },
        { ...post, body: "x".repeat(1_000_000) },
        { url: "https://jsonplaceholder.typicode.com/posts", method: "POST" },
        { ...post, format: "markdown", headers: { "X-Trace": "1" } },
        { ...post, countryCode: "US", solveCaptcha: true },
    ];
    for (const body of accepted) {
        await assertInputAccepted({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
    }
});

Deno.test({
    name: "string#request live (gated on STRING_API_KEY)",
    ignore: liveSkip("string"),
    fn: async () => {
        const unit = await testSealedUnit("string#request");
        const result = await runEndpoint({
            unit,
            input: { body: post },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence).length, 1);
        assertEquals(typeof result.usage.credits.default, "number");
    },
});
