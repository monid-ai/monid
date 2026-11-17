import { assert, assertEquals, assertRejects } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";
import { fromFileUrl } from "@std/path";

const inputs = {
    search: { query: "Tavily API", max_results: 2 },
    extract: { urls: ["https://example.com"] },
    crawl: { url: "https://example.com", limit: 2 },
    map: { url: "https://example.com", limit: 2 },
};
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

for (const [endpoint, body] of Object.entries(inputs)) {
    Deno.test(`tavily#${endpoint}: native receipt settles, including zero`, async () => {
        const unit = await testSealedUnit(`tavily#${endpoint}`);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-${endpoint}.json`,
        );
        for (const credits of [0, 0.5, 1, 2, 7]) {
            const response = fixture.calls[0].res.body as Record<string, Json>;
            response.usage = { credits };
            const result = await runEndpoint({
                unit,
                input: { body },
                mode: "replay",
                fixture,
            });
            assertEquals(result.httpStatus, 200);
            assertEquals(result.isProviderError, false);
            assertEquals(result.usage, {
                credits: credits === 0 ? {} : { default: credits },
                evidence: credits === 0 ? {} : { CREDIT: credits },
                ...(credits === 0.5
                    ? { mismatch: { derived: { default: 1 } } }
                    : {}),
            });
            const { usage: _usage, ...output } = response;
            assertEquals(result.output, output);
        }
    });

    Deno.test(`tavily#${endpoint}: errors are data and never billed`, async () => {
        const unit = await testSealedUnit(`tavily#${endpoint}`);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        );
        for (const status of [400, 401, 429, 432, 433, 500]) {
            fixture.calls[0].res.status = status;
            const result = await runEndpoint({
                unit,
                input: { body },
                mode: "replay",
                fixture,
            });
            assertEquals(result.httpStatus, status);
            assertEquals(result.isProviderError, true);
            assertEquals(result.usage, { credits: {}, evidence: {} });
            assertEquals(result.output, fixture.calls[0].res.body);
        }
    });

    Deno.test(`tavily#${endpoint}: no invented bill for missing or invalid receipt`, async () => {
        const unit = await testSealedUnit(`tavily#${endpoint}`);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-${endpoint}.json`,
        );
        const invalidUsage: (Json | undefined)[] = [
            undefined,
            {},
            { credits: "1" },
            { credits: -1 },
            { credits: null },
        ];
        for (const usage of invalidUsage) {
            const response = fixture.calls[0].res.body as Record<string, Json>;
            if (usage === undefined) delete response.usage;
            else response.usage = usage;
            await assertRejects(() =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture })
            );
        }
    });

    Deno.test(`tavily#${endpoint}: bearer auth, attribution and usage reach the wire`, async () => {
        const unit = await testSealedUnit(`tavily#${endpoint}`);
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-${endpoint}.json`,
        );
        let calls = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: (url, init) => {
                    calls++;
                    assertEquals(
                        String(url),
                        `https://api.tavily.com/${endpoint}`,
                    );
                    assertEquals(init?.method, "POST");
                    const headers = new Headers(init?.headers);
                    assertEquals(
                        headers.get("authorization"),
                        "Bearer test-key",
                    );
                    assertEquals(headers.get("x-client-name"), "monid");
                    const sent = JSON.parse(String(init?.body));
                    assertEquals(sent.include_usage, true);
                    assert(!("api_key" in sent));
                    for (const [key, value] of Object.entries(body)) {
                        assertEquals(sent[key], value);
                    }
                    // Auto search must reach Tavily without an injected depth/topic.
                    if (endpoint === "search") {
                        assertEquals(sent.auto_parameters, true);
                        assert(!("search_depth" in sent));
                        assert(!("topic" in sent));
                    }
                    return Promise.resolve(
                        new Response(
                            JSON.stringify(fixture.calls[0].res.body),
                            { status: 200 },
                        ),
                    );
                },
            }),
        });
        const loaded = await engine.load(unit);
        await loaded.run({
            body: {
                ...body,
                include_usage: false,
                api_key: "caller-key",
                ...(endpoint === "search" ? { auto_parameters: true } : {}),
            },
        });
        assertEquals(calls, 1);
    });
}

Deno.test("tavily: shared auth, request and receipt hooks are interned", async () => {
    const units = await Promise.all(
        Object.keys(inputs).map((name) => testSealedUnit(`tavily#${name}`)),
    );
    for (const { doc } of units) {
        assertEquals(doc.auth.inject.$fn.key, units[0].doc.auth.inject.$fn.key);
        assertEquals(
            doc.input.toRequest?.$fn.key,
            units[0].doc.input.toRequest?.$fn.key,
        );
        assertEquals(
            doc.usage.evidence.$fn.key,
            units[0].doc.usage.evidence.$fn.key,
        );
        assertEquals(
            doc.usage.consolidate?.$fn.key,
            units[0].doc.usage.consolidate?.$fn.key,
        );
    }
});
