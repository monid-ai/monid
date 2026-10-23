import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
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
const BASE = "https://mcp.maxeds.org/v1/tools/";

/** One recorded happy chain per endpoint. The connector maps nothing, so
 *  the recorded body IS the contract: a dropped source URL or an injected
 *  field must fail. */
const HAPPY: Record<string, { fixture: string; input: RunInput }> = {
    "salesbook#v1/tools/search_startups": {
        fixture: "search-ok",
        input: { body: { query: "prior authorization", limit: 2 } },
    },
    "salesbook#v1/tools/get_profile": {
        fixture: "profile-ok",
        input: { body: { startup_id: "cohere-health" } },
    },
    "salesbook#v1/tools/get_ranking": {
        fixture: "ranking-ok",
        input: { body: { sector: "healthcare" } },
    },
    "salesbook#v1/tools/find_alternatives": {
        fixture: "alternatives-ok",
        input: { body: { company: "Glean", limit: 2 } },
    },
    "salesbook#v1/tools/compare_vendors": {
        fixture: "compare-ok",
        input: { body: { vendors: ["Glean", "Notion"] } },
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

Deno.test("salesbook: five read-only POSTs, keyless, FREE, nothing mapped", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("salesbook#")
    ).sort();
    // read-only on purpose: no write tool is ported
    assertEquals(ids, IDS);

    const authKey = bundle.endpoints[ids[0]].auth.inject.$fn.key;
    const synthesizedKey = bundle.endpoints[ids[0]].usage.evidence.$fn.key;
    assertEquals(
        bundle.fnTable[synthesizedKey].provenance,
        "core#usage.synthesizedEmpty",
    );
    for (const id of ids) {
        const doc = bundle.endpoints[id];
        const tool = id.slice("salesbook#v1/tools/".length);
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
        // the vendor's text passes through untouched
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.output.fromResponse, undefined, id);
        assertEquals(doc.output.fromError, undefined, id);
        assertEquals(doc.timeouts.requestMs, 15_000, id);
        assertEquals(doc.timeouts.runMs, 20_000, id);
    }
});

Deno.test("salesbook: happy chains (recorded 2026-10-22) replay verbatim at zero usage", async () => {
    for (const [id, { fixture, input }] of Object.entries(HAPPY)) {
        const { result, recorded } = await replay(id, fixture, input);
        assertEquals(result.httpStatus, 200, id);
        assertEquals(result.isProviderError, false, id);
        assertEquals(result.usage, FREE, id);
        assertEquals(result.output, recorded, id);
        assertEquals((result.output as { isError: boolean }).isError, false);
    }
});

Deno.test("salesbook: answers keep their sources, dates and method version", async () => {
    const text = async (id: string) => {
        const { fixture, input } = HAPPY[id];
        const { result } = await replay(id, fixture, input);
        return (result.output as { text: string }).text;
    };
    const search = await text("salesbook#v1/tools/search_startups");
    assertEquals(search.match(/source: https:\/\//g)?.length, 2);
    assert(search.includes("Method v0.2.7"));

    const profile = await text("salesbook#v1/tools/get_profile");
    assert(profile.includes("checked 2026-10-13"));
    assert(profile.includes("https://coherehealth.com/news/"));

    const ranking = JSON.parse(await text("salesbook#v1/tools/get_ranking"));
    assertEquals(ranking.methodologyVersion, "v0.2.7");
    assertEquals(ranking.entries.length, 3);
    assertEquals(ranking.entries[0].rank, 1);
});

Deno.test("salesbook: empty answers are 200s that say so", async () => {
    const cases: [string, string, RunInput, string][] = [
        [
            "salesbook#v1/tools/search_startups",
            "search-empty",
            { body: { query: "zzqxvqqq", limit: 2 } },
            "No matches",
        ],
        [
            "salesbook#v1/tools/find_alternatives",
            "alternatives-empty",
            { body: { company: "zzqxvqqq" } },
            "No ranked enterprise alternatives",
        ],
        [
            "salesbook#v1/tools/compare_vendors",
            "compare-partial",
            { body: { vendors: ["Glean", "zzqxvqqq"] } },
            "zzqxvqqq — Not listed in SalesBook yet",
        ],
    ];
    for (const [id, fixture, input, says] of cases) {
        const { result, recorded } = await replay(id, fixture, input);
        assertEquals(result.httpStatus, 200, fixture);
        assertEquals(result.isProviderError, false, fixture);
        assertEquals(result.usage, FREE, fixture);
        assertEquals(result.output, recorded, fixture);
        assert((result.output as { text: string }).text.includes(says));
    }
});

Deno.test("salesbook: vendor 4xx/5xx are data, zero usage, body untouched", async () => {
    const cases: [string, string, RunInput, number][] = [
        // recorded: the binding passes these, the vendor refuses them
        [
            "salesbook#v1/tools/get_profile",
            "profile-unknown-id",
            { body: { startup_id: "x" } },
            400,
        ],
        // synthetic (shapes from the vendor's REST handler)
        [
            "salesbook#v1/tools/search_startups",
            "synthetic-rate-limited",
            { body: { query: "prior authorization" } },
            429,
        ],
        [
            "salesbook#v1/tools/search_startups",
            "synthetic-maintenance",
            { body: { query: "prior authorization" } },
            503,
        ],
        [
            "salesbook#v1/tools/search_startups",
            "synthetic-server-error",
            { body: { query: "prior authorization" } },
            500,
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

Deno.test("salesbook: the binding rejects what the vendor would 400, before any call", async () => {
    // the recorded vendor 400s these bindings now pre-empt
    for (const fixture of ["search-bad-input", "compare-bad-input"]) {
        const fx = await loadFixture(`${FIXTURES}${fixture}.json`);
        assertEquals(fx.calls[0].res.status, 400, fixture);
        assertEquals(
            (fx.calls[0].res.body as { isError: boolean }).isError,
            true,
        );
    }
    const rejected: [string, Json][] = [
        ["search_startups", {}],
        ["search_startups", { query: "" }],
        ["search_startups", { query: "x", limit: 0 }],
        ["search_startups", { query: "x", limit: 26 }],
        ["search_startups", { query: "x", limit: 2.5 }],
        ["search_startups", { query: "x", sector: "finance" }],
        ["get_profile", {}],
        ["get_profile", { startup_id: "" }],
        ["get_ranking", {}],
        ["get_ranking", { sector: "finance" }],
        ["get_ranking", { sector: "retail", period: "" }],
        ["find_alternatives", {}],
        ["find_alternatives", { company: "" }],
        ["find_alternatives", { company: "Glean", limit: 16 }],
        ["compare_vendors", { vendors: ["Glean"] }],
        ["compare_vendors", { vendors: ["a", "b", "c", "d", "e", "f"] }],
        ["compare_vendors", { vendors: ["Glean", ""] }],
        ["compare_vendors", { vendors: "Glean, Notion" }],
    ];
    for (const [tool, body] of rejected) {
        // no fixture: any upstream call would itself fail the test
        const unit = await testSealedUnit(`salesbook#v1/tools/${tool}`);
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            `${tool} ${JSON.stringify(body)}`,
        );
    }
    // near-twins of the bounds above clear the gate (replay matches
    // method + url, not body)
    const passing: [string, string, Json][] = [
        ["search_startups", "search-ok", { query: "x", limit: 1 }],
        ["search_startups", "search-ok", { query: "x", limit: 25 }],
        ["search_startups", "search-ok", { query: "x", sector: "agentic" }],
        ["get_ranking", "ranking-ok", { sector: "retail", period: "2026-q4" }],
        ["find_alternatives", "alternatives-ok", { company: "x", limit: 15 }],
        [
            "compare_vendors",
            "compare-ok",
            { vendors: ["a", "b", "c", "d", "e"], buyer_context: "retail" },
        ],
    ];
    for (const [tool, fixture, body] of passing) {
        const ok = await replay(`salesbook#v1/tools/${tool}`, fixture, {
            body,
        });
        assertEquals(ok.result.isProviderError, false, JSON.stringify(body));
    }
});

/** Engine wired to a capturing fetch: what actually leaves the process. */
function captureEngine(
    seen: { url: string; init: RequestInit }[],
    respond: (signal?: AbortSignal | null) => Promise<Response>,
) {
    return new Engine({
        transport: directTransport({
            // the doc asks for no credential fields; nothing is resolved
            params: () => Promise.resolve({}),
            fetch: (input, init) => {
                seen.push({ url: String(input), init: init ?? {} });
                return respond(init?.signal);
            },
        }),
    });
}

Deno.test("salesbook: egress is bare: no key, no tracking, body as given", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const engine = captureEngine(seen, () =>
        Promise.resolve(
            new Response(JSON.stringify({ text: "ok", isError: false }), {
                status: 200,
                headers: { "content-type": "application/json" },
            }),
        ));
    const unit = await testSealedUnit("salesbook#v1/tools/search_startups");
    const loaded = await engine.load(unit);
    const body = { query: "prior authorization", sector: "healthcare" };
    const result = await loaded.run({ body });
    assertEquals(result.output, { text: "ok", isError: false });
    assertEquals(seen.length, 1);
    assertEquals(seen[0].url, BASE + "search_startups");
    assertEquals(seen[0].init.method, "POST");
    assertEquals(seen[0].init.headers, { "content-type": "application/json" });
    assertEquals(JSON.parse(String(seen[0].init.body)), body);
});

Deno.test("salesbook: a hung upstream is cut off at requestMs", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
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
    const unit = await testSealedUnit("salesbook#v1/tools/get_profile");
    // same doc, a 50 ms budget so the test does not wait 15 s
    const loaded = await engine.load({
        ...unit,
        doc: {
            ...unit.doc,
            timeouts: { ...unit.doc.timeouts, requestMs: 50 },
        },
    });
    const error = await assertRejects(
        () => loaded.run({ body: { startup_id: "cohere-health" } }),
        EngineError,
    );
    assertEquals(error.code, EngineErrorCode.EXECUTION_FAILED);
    assert(error.message.includes("abort"), error.message);
    assertEquals(seen.length, 1);
});

Deno.test("salesbook: fixtures stay small (largest response under 4 KiB)", async () => {
    for await (const entry of Deno.readDir(FIXTURES)) {
        const bytes = (await Deno.stat(`${FIXTURES}${entry.name}`)).size;
        assert(bytes < 4096, `${entry.name} is ${bytes} bytes`);
    }
});

Deno.test({
    name: "salesbook live (gated on SALESBOOK_LIVE=1; keyless, free)",
    ignore: Deno.env.get("SALESBOOK_LIVE") !== "1",
    fn: async () => {
        for (const [id, { input }] of Object.entries(HAPPY)) {
            const unit = await testSealedUnit(id);
            const result = await runEndpoint({ unit, input, mode: "live" });
            assertEquals(
                result.isProviderError,
                false,
                `${id} ${JSON.stringify(result.output)}`,
            );
            assertEquals(result.usage, FREE, id);
            const output = result.output as { text: string; isError: boolean };
            assertEquals(typeof output.text, "string", id);
            assertEquals(output.isError, false, id);
            // the ranking is the one large answer (~50 KB untrimmed)
            assert(JSON.stringify(output).length < 256 * 1024, id);
        }
    },
});
