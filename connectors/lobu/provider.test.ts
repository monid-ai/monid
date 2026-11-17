import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import { z } from "zod";
import {
    directTransport,
    Engine,
    EngineError,
    EngineErrorCode,
} from "@monid/connector-engine";
import {
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const FIXTURES = fromFileUrl(new URL("./fixtures/", import.meta.url));
const BASE = "https://app.lobu.ai/api/market/";

/**
 * One recorded happy chain per endpoint. The connector maps nothing, so the
 * recorded body IS the contract: a dropped source URL, source date, or
 * content field must fail.
 */
const HAPPY: Record<string, { fixture: string; input: RunInput }> = {
    "lobu#api/market/read_knowledge": {
        fixture: "read-knowledge-ok",
        input: {
            body: {
                content_ids: [2286657],
            },
        },
    },
};
const IDS = Object.keys(HAPPY).sort();

const FREE = { credits: {}, evidence: {} };

async function replay(id: string, fixture: string, input: RunInput) {
    const unit = await testSealedUnit(id);
    const fx = await loadFixture(`${FIXTURES}${fixture}.json`);
    return {
        result: await runEndpoint({ unit, input, mode: "replay", fixture: fx }),
        recorded: fx.calls[0].res.body,
    };
}

Deno.test("lobu: public discussion search and reading, keyless, FREE, nothing mapped", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("lobu#")
    ).sort();
    // read-only on purpose: no write or session-only tool is ported
    assertEquals(ids, IDS);

    const authKey = bundle.endpoints[ids[0]].auth.inject.$fn.key;
    const synthesizedKey = bundle.endpoints[ids[0]].usage.evidence.$fn.key;
    assertEquals(
        bundle.fnTable[synthesizedKey].provenance,
        "core#usage.synthesizedEmpty",
    );
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        const tool = id.slice("lobu#api/market/".length);
        assertEquals(doc.request.method, "POST", id);
        assertEquals(doc.request.url, BASE + tool, id);
        // keyless: one identity inject, an empty credential shape
        assertEquals(doc.auth.inject.$fn.key, authKey, id);
        assertEquals(
            Object.keys(
                (doc.auth.credentials as { properties?: object })
                    .properties ?? {},
            ),
            [],
            id,
        );
        // FREE: no meter, compiler-synthesized quantities
        assertEquals(doc.usage.model.kind, "FREE", id);
        assertEquals(doc.usage.consolidate, undefined, id);
        assertEquals(doc.usage.evidence.$fn.key, synthesizedKey, id);
        assertEquals(doc.usage.estimate.$fn.key, synthesizedKey, id);
        // the vendor's JSON passes through untouched
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
        assertEquals(doc.output.fromError, undefined, id);
        assertEquals(doc.timeouts.requestMs, 25_000, id);
        assertEquals(doc.timeouts.runMs, 30_000, id);
        const description = doc.meta.description ?? "";
        const notesText = (doc.meta.notes ?? []).join(" ");
        assert(!description.includes("--from-org"), id);
        assert(!notesText.includes("/connect/managed"), id);
        assert(notesText.includes("stored public knowledge"), id);
        assert(!doc.meta.categories?.includes("tiktok"), id);
    }
});

Deno.test("lobu: happy chains (recorded 2026-10-24) replay verbatim at zero usage", async () => {
    for (const [id, { fixture, input }] of Object.entries(HAPPY)) {
        const { result, recorded } = await replay(id, fixture, input);
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, FREE, id);
        assertEquals(result.output, recorded, id);
    }
});

Deno.test("lobu: answers keep their content identifiers, source URLs, permalinks, and source dates", async () => {
    const knowledge = (
        await replay(
            "lobu#api/market/read_knowledge",
            HAPPY["lobu#api/market/read_knowledge"].fixture,
            HAPPY["lobu#api/market/read_knowledge"].input,
        )
    ).result.output as {
        content: {
            id: number;
            platform: string;
            source_url: string;
            permalink: string;
            occurred_at: string;
        }[];
    };
    assertEquals(knowledge.content.length, 1);
    assertEquals(knowledge.content[0].id, 2286657);
    assertEquals(knowledge.content[0].platform, "reddit");
    assertEquals(knowledge.content[0].occurred_at, "2025-04-29T12:02:32.000Z");
    assertEquals(
        knowledge.content[0].source_url,
        "https://reddit.com/r/webdev/comments/1kam74j/ai_coding_assistants_inside_ides_are_about_to/",
    );
    assertEquals(
        knowledge.content[0].permalink,
        "https://app.lobu.ai/market/events/2286657",
    );
});

Deno.test("lobu: empty answers are 200s with empty collections and zero usage", async () => {
    const knowledgeEmpty = await replay(
        "lobu#api/market/read_knowledge",
        "read-knowledge-empty",
        { body: { content_ids: [999999999] } },
    );
    assertEquals(knowledgeEmpty.result.httpStatus, 200);
    assertEquals(knowledgeEmpty.result.isProviderError, false);
    assertEquals(knowledgeEmpty.result.usage, FREE);
    assertEquals(knowledgeEmpty.result.output, knowledgeEmpty.recorded);
    assertEquals(
        (knowledgeEmpty.result.output as { content: unknown[] }).content,
        [],
    );
});

Deno.test("lobu: vendor 4xx/5xx are data, zero usage, body untouched", async () => {
    const cases: [string, string, RunInput, number][] = [
        // recorded: unknown/unshared entity_id on read_knowledge returns 403
        [
            "lobu#api/market/read_knowledge",
            "read-knowledge-unknown-entity",
            { body: { entity_id: 999999999, limit: 1 } },
            403,
        ],
        // synthetic rate-limit and maintenance shapes
        [
            "lobu#api/market/read_knowledge",
            "synthetic-rate-limited",
            {
                body: {
                    query: "Anthropic",
                    limit: 1,
                },
            },
            429,
        ],
        [
            "lobu#api/market/read_knowledge",
            "synthetic-maintenance",
            {
                body: {
                    query: "Anthropic",
                    limit: 1,
                },
            },
            503,
        ],
    ];
    for (const [id, fixture, input, status] of cases) {
        const { result, recorded } = await replay(id, fixture, input);
        assertEquals(result.httpStatus, status, fixture);
        assertEquals(result.isProviderError, true, fixture);
        assertEquals(result.usage, FREE, fixture);
        assertEquals(result.output, recorded, fixture);
    }
});

Deno.test("lobu: the binding rejects what the vendor would 400, before any call", async () => {
    const rejected: [string, Json][] = [
        ["read_knowledge", { query: "" }],
        ["read_knowledge", { query: "   " }],
        ["read_knowledge", { content_ids: [] }],
        ["read_knowledge", { content_ids: [0] }],
        ["read_knowledge", { content_ids: [1.5] }],
        ["read_knowledge", { entity_id: 0 }],
        ["read_knowledge", { entity_id: 1.5 }],
        ["read_knowledge", { platforms: [] }],
        ["read_knowledge", { platforms: [""] }],
        ["read_knowledge", { limit: 0 }],
        ["read_knowledge", { limit: 101 }],
        ["read_knowledge", { limit: 1.5 }],
        ["read_knowledge", { offset: -1 }],
        ["read_knowledge", { min_similarity: -0.1 }],
        ["read_knowledge", { min_similarity: 1.5 }],
        ["read_knowledge", { vector_weight: -0.1 }],
        ["read_knowledge", { vector_weight: 1.5 }],
        ["read_knowledge", { sort_by: "popularity" }],
        ["read_knowledge", { sort_order: "sideways" }],
    ];
    for (const [tool, body] of rejected) {
        // no fixture: any upstream call would itself fail the test
        const unit = await testSealedUnit(`lobu#api/market/${tool}`);
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            `${tool} ${JSON.stringify(body)}`,
        );
    }

    // boundary-valid twins clear the gate
    const passing: [string, string, Json][] = [
        [
            "read_knowledge",
            "read-knowledge-ok",
            {
                query: "Cursor",
                platforms: ["reddit"],
                sort_by: "score",
                sort_order: "desc",
                include_total: false,
                limit: 100,
                offset: 0,
            },
        ],
    ];
    for (const [tool, fixture, body] of passing) {
        const ok = await replay(`lobu#api/market/${tool}`, fixture, { body });
        assertEquals(ok.result.isProviderError, false, JSON.stringify(body));
    }
});

interface CapturedInit {
    method?: string;
    headers?: unknown;
    body?: unknown;
    signal?: AbortSignal | null;
}

/** Engine wired to a capturing fetch: what actually leaves the process. */
function captureEngine(
    seen: { url: string; init: CapturedInit }[],
    respond: (signal?: AbortSignal | null) => Promise<Response>,
) {
    return new Engine({
        transport: directTransport({
            params: () => Promise.resolve({}),
            fetch: (input, init) => {
                const captured = (init ?? {}) as CapturedInit;
                seen.push({ url: String(input), init: captured });
                return respond(captured.signal);
            },
        }),
    });
}

Deno.test("lobu: egress is bare: no key, no tracking, body as given", async () => {
    const seen: { url: string; init: CapturedInit }[] = [];
    const engine = captureEngine(seen, () =>
        Promise.resolve(
            new Response(
                JSON.stringify({ content: [] }),
                {
                    status: 200,
                    headers: { "content-type": "application/json" },
                },
            ),
        ));
    const unit = await testSealedUnit("lobu#api/market/read_knowledge");
    const loaded = await engine.load(unit);
    const body = { query: "Linear pricing complaints", limit: 3 };
    const result = await loaded.run({ body });
    assertEquals(result.output, { content: [] });
    assertEquals(seen.length, 1);
    assertEquals(seen[0].url, BASE + "read_knowledge");
    assertEquals(seen[0].init.method, "POST");
    assertEquals(seen[0].init.headers, { "content-type": "application/json" });
    assertEquals(JSON.parse(String(seen[0].init.body)), body);
});

Deno.test("lobu: a non-JSON 500 from the edge is data, zero usage", async () => {
    const seen: { url: string; init: CapturedInit }[] = [];
    const engine = captureEngine(seen, () =>
        Promise.resolve(
            new Response("error code: 502", {
                status: 500,
                headers: { "content-type": "text/plain" },
            }),
        ));
    const unit = await testSealedUnit("lobu#api/market/read_knowledge");
    const loaded = await engine.load(unit);
    const result = await loaded.run({ body: { query: "Anthropic" } });
    assertEquals(result.httpStatus, 500);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, FREE);
    assertEquals(result.output, "error code: 502");
    assertEquals(seen.length, 1);
});

Deno.test("lobu: a hung upstream is cut off at requestMs", async () => {
    const seen: { url: string; init: CapturedInit }[] = [];
    const engine = captureEngine(
        seen,
        (signal) =>
            new Promise((_, reject) =>
                signal?.addEventListener(
                    "abort",
                    () => reject(new DOMException("aborted", "AbortError")),
                )
            ),
    );
    const unit = await testSealedUnit("lobu#api/market/read_knowledge");
    const loaded = await engine.load({
        ...unit,
        doc: {
            ...unit.doc,
            timeouts: { ...unit.doc.timeouts, requestMs: 50 },
        },
    });
    const error = await assertRejects(
        () => loaded.run({ body: { query: "Linear" } }),
        EngineError,
    );
    assertEquals(error.code, EngineErrorCode.EXECUTION_FAILED);
    assert(error.message.includes("abort"), error.message);
    assertEquals(seen.length, 1);
});

Deno.test("lobu: fixtures stay small (largest response under 10 KiB)", async () => {
    for await (const entry of Deno.readDir(FIXTURES)) {
        const bytes = (await Deno.stat(`${FIXTURES}${entry.name}`)).size;
        assert(bytes < 10_240, `${entry.name} is ${bytes} bytes`);
    }
});

const zKnowledgeResult = z.object({
    content: z.array(z.object({
        id: z.number().int().positive(),
        title: z.string().nullable(),
        text_content: z.string().nullable(),
        payload_text: z.string().nullable(),
        source_url: z.string().nullable(),
        occurred_at: z.string().nullable(),
        origin_id: z.string().nullable(),
        is_superseded: z.boolean(),
    })),
    total: z.number().nullable(),
    chain_total: z.number().optional(),
    page: z.object({ has_more: z.boolean() }),
});

Deno.test({
    name: "lobu live: direct discussion search-to-read (LOBU_LIVE=1)",
    ignore: Deno.env.get("LOBU_LIVE") !== "1",
    fn: async () => {
        const unit = await testSealedUnit("lobu#api/market/read_knowledge");
        let anonymousRequests = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({}),
                fetch: (input, init) => {
                    const headers = new Headers(
                        (init as { headers?: HeadersInit } | undefined)
                            ?.headers,
                    );
                    assert(!headers.has("authorization"));
                    assert(!headers.has("cookie"));
                    anonymousRequests++;
                    return fetch(input, init);
                },
            }),
        });
        const loaded = await engine.load(unit);
        const runLive = (body: Json) => loaded.run({ body });
        for (
            const query of ["Linear pricing complaints", "Notion alternatives"]
        ) {
            const started = Date.now();
            const found = await runLive({
                query,
                limit: 3,
                include_total: false,
            });
            assertEquals(found.httpStatus, 200);
            assertEquals(found.isProviderError, false, query);
            assertEquals(found.usage, FREE, query);
            const items = zKnowledgeResult.parse(found.output).content;
            assert(items.length > 0 && items.length <= 3, query);
            const source = items.find((item) =>
                item.source_url?.startsWith("https://") &&
                `${item.title ?? ""} ${
                    item.text_content ?? item.payload_text ?? ""
                }`
                    .toLowerCase().includes(query.split(" ")[0].toLowerCase())
            );
            assert(
                source,
                `No sourced discussion mentions the requested product: ${query}`,
            );
            assert(Number.isInteger(source.id) && source.id > 0);
            assert(
                source.occurred_at &&
                    Number.isFinite(Date.parse(source.occurred_at)),
            );
            const next = await runLive({
                query,
                limit: 3,
                offset: 3,
                include_total: false,
            });
            assertEquals(next.httpStatus, 200);
            assertEquals(next.isProviderError, false);
            const nextItems = zKnowledgeResult.parse(next.output).content;
            assert(
                !nextItems.some((item) =>
                    items.some((first) => first.id === item.id)
                ),
                "Search pagination repeated a stored event ID",
            );
            let read = await runLive({ content_ids: [source.id], limit: 3 });
            assertEquals(read.httpStatus, 200);
            assertEquals(read.isProviderError, false, query);
            assertEquals(read.usage, FREE, query);
            let result = zKnowledgeResult.parse(read.output);
            assertEquals(result.chain_total, 1);
            // Exact reads expand a source's version history, oldest first.
            // Inspect the last bounded page instead of assuming one ID = one row.
            if (result.page.has_more) {
                assert(typeof result.total === "number");
                read = await runLive({
                    content_ids: [source.id],
                    limit: 3,
                    offset: Math.max(0, result.total - 3),
                });
                assertEquals(read.httpStatus, 200);
                assertEquals(read.isProviderError, false, query);
                assertEquals(read.usage, FREE, query);
                result = zKnowledgeResult.parse(read.output);
            }
            assert(result.content.length > 0 && result.content.length <= 3);
            for (const item of result.content) {
                assertEquals(item.origin_id, source.origin_id);
                assertEquals(item.source_url, source.source_url);
                assert(
                    item.occurred_at &&
                        Number.isFinite(Date.parse(item.occurred_at)),
                );
            }
            const current = result.content.find((item) => !item.is_superseded);
            assert(
                current,
                "Source history must contain a current version on its last page",
            );
            assert(
                (current.text_content ?? current.payload_text ?? "").length > 0,
            );
            console.log(
                JSON.stringify({
                    query,
                    results: items.length,
                    pagination: "passed",
                    searchAndReadMs: Date.now() - started,
                    source: source.source_url,
                    occurred_at: source.occurred_at,
                }),
            );
        }
        assert(anonymousRequests >= 6);
        console.log(
            JSON.stringify({ anonymousRequests, credentialsSent: false }),
        );
    },
});
