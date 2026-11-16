import {
    assert,
    assertAlmostEquals,
    assertEquals,
    assertRejects,
} from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "specstream#v1/web-search";

Deno.test("specstream: two endpoints, shared auth/error/receipt fns, hundredths-of-a-cent meter", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("specstream#")
    ).sort();
    assertEquals(ids, ["specstream#v1/extract", "specstream#v1/web-search"]);

    const search = bundle.endpoints["specstream#v1/web-search"];
    const extract = bundle.endpoints["specstream#v1/extract"];
    assertEquals(search.request.method, "POST");
    assertEquals(search.request.url, "https://api.specstream.ai/v1/web-search");
    assertEquals(extract.request.method, "POST");
    assertEquals(extract.request.url, "https://api.specstream.ai/v1/extract");

    assertEquals(search.auth.inject.$fn.key, extract.auth.inject.$fn.key);
    assertEquals(
        search.output.fromError?.$fn.key,
        extract.output.fromError?.$fn.key,
    );
    assert(search.usage.consolidate !== undefined);
    assertEquals(
        search.usage.consolidate?.$fn.key,
        extract.usage.consolidate?.$fn.key,
    );
    assertEquals(
        search.usage.evidence.$fn.key,
        extract.usage.evidence.$fn.key,
    );
    assert(search.usage.estimate.$fn.key !== extract.usage.estimate.$fn.key);

    for (const id of ids) {
        const doc = bundle.endpoints[id];
        assertEquals(Object.keys(doc.usage.credits), ["default"], id);
        const model = doc.usage.model;
        assertEquals(model.kind, "PER_UNIT", id);
        assertEquals(
            "unit" in model ? model.unit : undefined,
            "CREDIT",
            id,
        );
        assertEquals(
            "consumes" in model ? model.consumes : undefined,
            { credit: "default", amount: 0.0001 },
            id,
        );
    }
});

Deno.test("specstream#v1/web-search: an answered search bills the price on its receipt", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: { q: "In what year was Symfony first released?", num: 2 },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-web-search-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    const data = (result.output as { data: Record<string, unknown> }).data;
    assertEquals(data.kind, "fact");
    const answer = data.answer as { value: string; page: string };
    assertEquals(typeof answer.value, "string");
    assertEquals(answer.page.startsWith("https://"), true);
    assertEquals(result.usage, {
        credits: { default: 0.005 },
        evidence: { CREDIT: 50 },
    });
    assertEquals(result.usage.mismatch, undefined);
});

Deno.test("specstream#v1/web-search: a fast search returns results alone at the fast price", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: { q: "deno runtime release notes", speed: "fast", num: 2 },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-web-search-fast.json`),
    });
    assertEquals(result.httpStatus, 200);
    const data = (result.output as { data: Record<string, unknown> }).data;
    assertEquals(data.answer, null);
    assertEquals((data.sources as unknown[]).length, 2);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { CREDIT: 10 },
    });
});

Deno.test("specstream#v1/web-search: estimate follows the base and per-10-result rule", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(await estimateEndpoint(unit, { body: { q: "test" } }), {
        credits: { default: 0.005 },
        evidence: { CREDIT: 50 },
    });
    const fastMore = await estimateEndpoint(unit, {
        body: { q: "test", speed: "fast", num: 25 },
    });
    assertEquals(fastMore.evidence, { CREDIT: 34 });
    assertAlmostEquals(fastMore.credits.default, 0.0034, 1e-12);
    assertEquals(
        await estimateEndpoint(unit, {
            body: { q: "test", news: true, num: 10 },
        }),
        {
            credits: { default: 0.001 },
            evidence: { CREDIT: 10 },
        },
    );
});

Deno.test("specstream#v1/web-search: a refused request is zero-billed error data", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { q: "   " } },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-web-search-rejected.json`,
        ),
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(
        (result.output as { code?: string }).code,
        "unquoted_plan",
    );
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("specstream#v1/web-search: the gate needs q and bounds every field", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-web-search-ok.json`);
    const required = unit.doc.input.schema.body?.required as string[];
    assertEquals(required, ["q"]);
    const rejected = (body: Json) =>
        assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    await rejected({});
    await rejected({ q: "" });
    await rejected({ q: "x".repeat(2001) });
    await rejected({ q: "news", num: 0 });
    await rejected({ q: "news", num: 101 });
    await rejected({ q: "news", page: 11 });
    await rejected({ q: "news", speed: "slow" });
    await rejected({ q: "news", country: "DEU" });
    await assertInputAccepted({
        unit,
        mode: "replay",
        fixture,
        input: {
            body: {
                q: "x".repeat(2000),
                speed: "fast",
                num: 100,
                page: 10,
                news: true,
                language: "de",
                country: "DE",
                safe: "strict",
            },
        },
    });
});

Deno.test({
    name: "specstream#v1/web-search live (gated on SPECSTREAM_API_KEY)",
    ignore: liveSkip("specstream"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    q: "deno runtime release notes",
                    speed: "fast",
                    num: 2,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence).sort(), ["CREDIT"]);
        assertEquals(typeof result.usage.credits.default, "number");
        const data = (result.output as { data: Record<string, unknown> }).data;
        assert(Array.isArray(data.sources), "sources array present");
    },
});
