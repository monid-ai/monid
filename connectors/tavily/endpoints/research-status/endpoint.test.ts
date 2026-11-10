import { assertEquals } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { fromFileUrl } from "@std/path";

Deno.test("tavily#research/{request_id}: authenticated bodyless GET preserves optional usage", async () => {
    const unit = await testSealedUnit("tavily#research/{request_id}");
    for (const includeUsage of [undefined, false, true]) {
        let calls = 0;
        const output = { request_id: "research/id?query", status: "failed" };
        const loaded = await new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: (url, init) => {
                    calls++;
                    const query = includeUsage === undefined
                        ? ""
                        : `?include_usage=${includeUsage}`;
                    assertEquals(
                        String(url),
                        `https://api.tavily.com/research/research%2Fid%3Fquery${query}`,
                    );
                    assertEquals(init?.method, "GET");
                    assertEquals(init?.body, undefined);
                    const headers = new Headers(init?.headers);
                    assertEquals(
                        headers.get("authorization"),
                        "Bearer test-key",
                    );
                    assertEquals(headers.get("x-client-name"), "monid");
                    return Promise.resolve(
                        new Response(JSON.stringify(output)),
                    );
                },
            }),
        }).load(unit);
        const result = await loaded.run({
            pathParams: { request_id: output.request_id },
            ...(includeUsage === undefined
                ? {}
                : { queryParams: { include_usage: includeUsage } }),
        });
        assertEquals(calls, 1);
        // A status read reports a failed job as data; it never submits or bills.
        assertEquals(result.httpStatus, 200);
        assertEquals(result.output, output);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    }
});

Deno.test("tavily#research/{request_id}: reads never rebill the original receipt", async () => {
    const unit = await testSealedUnit("tavily#research/{request_id}");
    const chain = await loadFixture(
        fromFileUrl(
            new URL("../../fixtures/synthetic-research.json", import.meta.url),
        ),
    );
    const input = {
        pathParams: { request_id: "synthetic-research" },
        queryParams: { include_usage: true },
    };
    assertEquals(await estimateEndpoint(unit, input), {
        credits: {},
        evidence: {},
    });
    for (const call of chain.calls.slice(1)) {
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture: {
                ...chain,
                calls: [{
                    ...call,
                    req: {
                        ...call.req,
                        url: "https://api.tavily.com/research/synthetic-research?include_usage=true",
                    },
                }],
            },
        });
        assertEquals(result.httpStatus, call.res.status);
        assertEquals(result.output, call.res.body);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    }
});
