import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("edge#use_skill happy (recorded 2026-11-03): instructions loaded, free settle", async () => {
    const unit = await testSealedUnit("edge#use_skill");
    const fixture = await loadFixture(`${fixturesDir}use-skill-ok.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                source: "onewave-ai/claude-skills",
                skill: "cold-email-sequence-generator",
                request_id: "ph27wv1s",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as Record<string, unknown>;
    assertEquals(output.source, "onewave-ai/claude-skills");
    assertEquals(output.skill, "cold-email-sequence-generator");
    assertEquals(output.security_state, "reviewed");
    assert((output.instructions as string).startsWith("---\nname: "));
});

Deno.test("edge#use_skill not in catalog (recorded 404): data, zero usage", async () => {
    const unit = await testSealedUnit("edge#use_skill");
    const fixture = await loadFixture(
        `${fixturesDir}use-skill-not-found.json`,
    );
    const result = await runEndpoint({
        unit,
        input: {
            body: { source: "edge-fixtures/none", skill: "no-such-skill-zzz" },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.outcome, "unavailable");
    assertEquals(output.security_state, "unknown");
    assertEquals(typeof output.error, "string");
});

Deno.test("edge#use_skill: skill required, length caps, strict body", async () => {
    const unit = await testSealedUnit("edge#use_skill");
    const fixture = await loadFixture(`${fixturesDir}use-skill-ok.json`);
    const rejected: Json[] = [
        {},
        { skill: "" },
        { source: "onewave-ai/claude-skills" },
        { skill: "x".repeat(201) },
        { skill: "s", source: "" },
        { skill: "s", request_id: "x".repeat(33) },
        { skill: "s", version: "x".repeat(81) },
        { skill: "s", bogus: 1 },
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
    const passing: Json[] = [
        { skill: "cold-email-sequence-generator" },
        { skill: "x".repeat(200) },
        { skill: "s", request_id: "x".repeat(32), version: "x".repeat(80) },
        {
            source: "onewave-ai/claude-skills",
            skill: "cold-email-sequence-generator",
            request_id: "ph27wv1s",
        },
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
    name: "edge find_skill -> use_skill live chain (gated on EDGE_API_KEY)",
    ignore: liveSkip("edge"),
    fn: async () => {
        const found = await runEndpoint({
            unit: await testSealedUnit("edge#find_skill"),
            input: { body: { query: "write a cold email sequence" } },
            mode: "live",
        });
        assertEquals(found.isProviderError, false);
        const list = found.output as {
            request_id: string;
            skills: { source: string; skill: string }[];
        };
        assert(list.skills.length > 0, "at least one skill");
        const { source, skill } = list.skills[0];
        const loaded = await runEndpoint({
            unit: await testSealedUnit("edge#use_skill"),
            input: { body: { source, skill, request_id: list.request_id } },
            mode: "live",
        });
        assertEquals(
            loaded.isProviderError,
            false,
            JSON.stringify(loaded.output),
        );
        assertEquals(loaded.usage, { credits: {}, evidence: {} });
        const output = loaded.output as Record<string, unknown>;
        assertEquals(output.skill, skill);
        assertEquals(output.security_state, "reviewed");
        assert((output.instructions as string).length > 200);
    },
});
