import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    directTransport,
    Engine,
    EngineError,
    EngineErrorCode,
} from "@monid/connector-engine";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const body = {
    input: "Explain Tavily's search API with sources.",
    model: "mini",
};

Deno.test("tavily#research: submit, poll and settle only the final receipt", async () => {
    const unit = await testSealedUnit("tavily#research");
    const fixture = await loadFixture(`${fixturesDir}synthetic-research.json`);
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 4 },
        evidence: { CREDIT: 4 },
    });
    const { usage: _usage, ...output } = fixture.calls.at(-1)!.res
        .body as Record<string, Json>;
    assertEquals(result.output, output);
    assertEquals(
        (result.output as Record<string, Json>).request_id,
        "synthetic-research",
    );
});

Deno.test("tavily#research: transient polls do not resubmit or end a running job", async () => {
    const unit = await testSealedUnit("tavily#research");
    const fixture = await loadFixture(`${fixturesDir}synthetic-research.json`);
    const poll = fixture.calls[1];
    fixture.calls.splice(
        1,
        0,
        ...[408, 429, 500, 502, 503, 504].map((status) => ({
            req: poll.req,
            res: { status, body: { detail: { error: "Try again" } } },
        })),
    );
    const result = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage.credits, { default: 4 });
});

Deno.test("tavily#research: failed jobs and rejected submissions are zero-billed", async () => {
    const unit = await testSealedUnit("tavily#research");
    const fixture = await loadFixture(`${fixturesDir}synthetic-research.json`);
    fixture.calls.at(-1)!.res.body = {
        request_id: "synthetic-research",
        status: "failed",
        usage: { credits: 0 },
    };
    const failed = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture,
    });
    assertEquals(failed.httpStatus, 502);
    assertEquals(failed.providerHttpStatus, 200);
    assertEquals(failed.isProviderError, true);
    assertEquals(failed.usage, { credits: {}, evidence: {} });
    assertEquals(failed.output, fixture.calls.at(-1)!.res.body);
    const rejected = await runEndpoint({
        unit,
        input: { body },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        ),
    });
    assertEquals(rejected.httpStatus, 401);
    assertEquals(rejected.usage, { credits: {}, evidence: {} });
});

Deno.test("tavily#research: missing job ID, unknown status and absent receipt fail", async () => {
    const unit = await testSealedUnit("tavily#research");
    for (const phase of ["submit", "status", "receipt", "content"]) {
        const fixture = await loadFixture(
            `${fixturesDir}synthetic-research.json`,
        );
        if (phase === "submit") {
            fixture.calls[0].res.body = { status: "pending" };
        }
        if (phase === "status") {
            fixture.calls[1].res.body = { status: "unexpected" };
        }
        if (phase === "content") {
            delete (fixture.calls.at(-1)!.res.body as Record<string, Json>)
                .content;
        }
        if (phase === "receipt") {
            delete (fixture.calls.at(-1)!.res.body as Record<string, Json>)
                .usage;
        }
        await assertRejects(() =>
            runEndpoint({ unit, input: { body }, mode: "replay", fixture })
        );
    }
});

Deno.test("tavily#research: admission reserves the published model maximum", async () => {
    const unit = await testSealedUnit("tavily#research");
    for (
        const [model, credits] of [["mini", 110], ["pro", 250], [
            "auto",
            250,
        ]] as const
    ) {
        assertEquals(
            await estimateEndpoint(unit, { body: { ...body, model } }),
            {
                credits: { default: credits },
                evidence: { CREDIT: credits },
            },
        );
    }
    assertEquals(
        (await estimateEndpoint(unit, { body: { input: body.input } })).credits,
        { default: 250 },
    );
    for (
        const invalid of [{ ...body, stream: true }, {
            ...body,
            model: "invalid",
        }, {
            ...body,
            files: Array(6).fill({ name: "notes.txt", data: "dGVzdA==" }),
        }]
    ) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body: invalid }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test("tavily#research: JSON submit and authenticated bodyless usage polls", async () => {
    const unit = await testSealedUnit("tavily#research");
    const fullBody = {
        ...body,
        stream: false,
        citation_format: "apa",
        include_domains: ["tavily.com"],
        exclude_domains: ["example.com"],
        output_length: "short",
        files: [{ name: "notes.md", data: "dGVzdA==", type: "base64" }],
        output_schema: {
            properties: {
                summary: { type: "string", description: "Summary" },
                api_key: { type: "string", description: "Documented key name" },
                include_usage: {
                    type: "string",
                    description: "Usage field description",
                },
                sources: {
                    type: "array",
                    description: "Sources",
                    items: { type: "string" },
                },
                details: {
                    type: "object",
                    description: "Details",
                    properties: {
                        count: { type: "integer", description: "Source count" },
                    },
                },
            },
            required: ["summary"],
        },
    };
    let calls = 0;
    const loaded = await new Engine({
        sleep: () => Promise.resolve(),
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                const headers = new Headers(init?.headers);
                assertEquals(headers.get("authorization"), "Bearer test-key");
                assertEquals(headers.get("x-client-name"), "monid");
                calls++;
                if (calls === 1) {
                    assertEquals(
                        String(url),
                        "https://api.tavily.com/research",
                    );
                    assertEquals(init?.method, "POST");
                    const sent = JSON.parse(String(init?.body));
                    assertEquals(sent.stream, false);
                    assert(!("include_usage" in sent));
                    assert(!("api_key" in sent));
                    assertEquals(sent, fullBody);
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                request_id: "research/id",
                                status: "pending",
                            }),
                            { status: 201 },
                        ),
                    );
                }
                assertEquals(
                    String(url),
                    "https://api.tavily.com/research/research%2Fid?include_usage=true",
                );
                assertEquals(init?.method, "GET");
                assertEquals(init?.body, undefined);
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            request_id: "research/id",
                            status: "completed",
                            content: { summary: "Report" },
                            sources: [],
                            usage: { credits: 4 },
                        }),
                    ),
                );
            },
        }),
    }).load(unit);
    const result = await loaded.run({
        body: {
            ...fullBody,
            api_key: "caller-key",
            include_usage: false,
        },
    });
    assertEquals(calls, 2);
    assertEquals((result.output as Record<string, Json>).content, {
        summary: "Report",
    });
});

Deno.test("tavily#research: local stop preserves the job ID for recovery without resubmitting", async () => {
    const unit = await testSealedUnit("tavily#research");
    const calls: string[] = [];
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (url, init) => {
                calls.push(`${init?.method} ${url}`);
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            request_id: "recoverable-job",
                            status: init?.method === "POST"
                                ? "pending"
                                : "in_progress",
                        }),
                        { status: init?.method === "POST" ? 201 : 202 },
                    ),
                );
            },
        }),
    }).load(unit);
    const started = await loaded.start({ body });
    assert(started.kind === "RUNNING");
    assertEquals(started.state.externalRunId, "recoverable-job");
    const polled = await loaded.poll({ body }, started.state);
    assert(polled.kind === "RUNNING");
    assertEquals(polled.state.externalRunId, "recoverable-job");
    assertEquals(await loaded.stop({ body }, polled.state), {
        kind: "STOPPED_UNSETTLED",
    });
    assertEquals(polled.state.externalRunId, "recoverable-job");
    assertEquals(calls, [
        "POST https://api.tavily.com/research",
        "GET https://api.tavily.com/research/recoverable-job?include_usage=true",
    ]);
});

Deno.test("tavily#research: run deadline stops polling without cancellation or resubmission", async () => {
    const unit = await testSealedUnit("tavily#research");
    let elapsed = 0;
    const methods: string[] = [];
    const loaded = await new Engine({
        // Clock reads advance too, so a zero-duration nap at the exact
        // deadline cannot freeze this fake clock.
        now: () => new Date(elapsed += 1),
        sleep: (ms) => {
            elapsed += ms;
            return Promise.resolve();
        },
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_url, init) => {
                methods.push(init?.method ?? "GET");
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            request_id: "deadline-job",
                            status: "pending",
                        }),
                        { status: init?.method === "POST" ? 201 : 202 },
                    ),
                );
            },
        }),
    }).load(unit);
    const error = await assertRejects(() => loaded.run({ body }));
    assert(error instanceof EngineError);
    assertEquals(error.code, EngineErrorCode.TIMEOUT);
    assert(elapsed >= 1_800_000 && elapsed < 1_805_000);
    assertEquals(methods.filter((method) => method === "POST").length, 1);
    assert(methods.length > 1);
    assert(methods.slice(1).every((method) => method === "GET"));
});

Deno.test({
    name:
        "tavily#research live (gated on credentials and TAVILY_LIVE_RESEARCH=1)",
    ignore: liveSkip("tavily") || Deno.env.get("TAVILY_LIVE_RESEARCH") !== "1",
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit("tavily#research"),
            input: { body: { ...body, output_length: "short" } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        const output = result.output as Record<string, Json>;
        assertEquals(output.status, "completed");
        assert(typeof output.content === "string" && output.content.length > 0);
        assert(Array.isArray(output.sources) && output.sources.length > 0);
        assert((result.usage.credits.default ?? 0) > 0);
    },
});
