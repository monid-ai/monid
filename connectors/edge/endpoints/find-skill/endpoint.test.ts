import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("edge: two POST endpoints, one bearer auth fn, FREE with synthesized quantities", async () => {
    const bundle = await testBundle();
    const ids = Object.keys(bundle.endpoints).filter((id) =>
        id.startsWith("edge#")
    ).sort();
    assertEquals(ids, ["edge#find_skill", "edge#use_skill"]);

    const find = bundle.endpoints["edge#find_skill"];
    const use = bundle.endpoints["edge#use_skill"];
    assertEquals(find.request.method, "POST");
    assertEquals(find.request.url, "https://getedge.cc/api/v1/find_skill");
    assertEquals(use.request.method, "POST");
    assertEquals(use.request.url, "https://getedge.cc/api/v1/use_skill");
    assertEquals(find.meta.categories, ["agent-skills"]);
    assertEquals(use.meta.categories, ["agent-skills"]);

    // one provider-level Authorization: Bearer fn serves both endpoints
    assertEquals(find.auth.inject.$fn.key, use.auth.inject.$fn.key);
    assertEquals(
        bundle.fnTable[find.auth.inject.$fn.key].provenance,
        "presets#auth.bearer",
    );

    // FREE provider (D27): no consolidate, both quantities slots are the
    // one compiler-synthesized `() => ({counts: {}})` entry
    const synthesizedKey = find.usage.evidence.$fn.key;
    for (const doc of [find, use]) {
        assertEquals(doc.usage.model.kind, "FREE");
        assertEquals(doc.usage.consolidate, undefined);
        assertEquals(doc.input.toRequest, undefined);
        assertEquals(doc.usage.estimate.$fn.key, synthesizedKey);
        assertEquals(doc.usage.evidence.$fn.key, synthesizedKey);
    }
    assertEquals(
        bundle.fnTable[synthesizedKey].provenance,
        "core#usage.synthesizedEmpty",
    );
});

Deno.test("edge#find_skill happy (recorded 2026-11-03): ranked skills, free settle", async () => {
    const unit = await testSealedUnit("edge#find_skill");
    const fixture = await loadFixture(`${fixturesDir}find-skill-ok.json`);
    const result = await runEndpoint({
        unit,
        input: { body: { query: "write a cold email sequence", limit: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // no output projection: the recorded body IS the contract
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as {
        request_id: string;
        skills: { source: string; skill: string; recommended: boolean }[];
        recommendation: { strength: string; source: string; skill: string };
    };
    assertEquals(output.skills.length, 2);
    assertEquals(output.recommendation.strength, "pick");
    assertEquals(output.skills[0].recommended, true);
    assertEquals(output.recommendation.source, output.skills[0].source);
    assertEquals(output.recommendation.skill, output.skills[0].skill);
    assert(output.request_id.length > 0);
});

Deno.test("edge#find_skill provider error (recorded 400): data, zero usage", async () => {
    const unit = await testSealedUnit("edge#find_skill");
    const fixture = await loadFixture(
        `${fixturesDir}find-skill-blank-query.json`,
    );
    const result = await runEndpoint({
        unit,
        // passes the schema (3 characters); Edge trims it and answers 400
        input: { body: { query: "   " } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("edge#find_skill: query required (3-500 chars), limit 1-5, strict body", async () => {
    const unit = await testSealedUnit("edge#find_skill");
    const fixture = await loadFixture(`${fixturesDir}find-skill-ok.json`);
    const rejected: Json[] = [
        {},
        { query: "" },
        { query: "ab" },
        { query: "x".repeat(501) },
        { query: "write a cold email sequence", limit: 0 },
        { query: "write a cold email sequence", limit: 6 },
        { query: "write a cold email sequence", limit: 2.5 },
        { query: "write a cold email sequence", keywords: "" },
        { query: "write a cold email sequence", bogus: 1 },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    // near-twins of the bounds above. Replay matches method+URL, not body.
    const passing: Json[] = [
        { query: "abc" },
        { query: "x".repeat(500) },
        { query: "write a cold email sequence", limit: 1 },
        { query: "write a cold email sequence", limit: 5 },
        { query: "write a cold email sequence", keywords: "cold email" },
    ];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(ok.isProviderError, false, JSON.stringify(body));
    }
});

Deno.test({
    name: "edge#find_skill live (gated on EDGE_API_KEY)",
    ignore: liveSkip("edge"),
    fn: async () => {
        const unit = await testSealedUnit("edge#find_skill");
        const result = await runEndpoint({
            unit,
            input: {
                body: { query: "write a cold email sequence", limit: 3 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        assert(Array.isArray(output.skills), "skills array present");
        // OpenAPI: request_id is string | null
        assert(
            output.request_id === null ||
                typeof output.request_id === "string",
            "request_id is a string or null",
        );
        assertEquals(
            typeof (output.recommendation as Record<string, unknown>)
                .strength,
            "string",
        );
    },
});
