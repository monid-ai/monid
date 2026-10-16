import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "lev8#v1/entity-search";
const TASK_ID = "leads_search_01JEXAMPLE000000000000";
const RECORDED_ID = "leads_search_ac4f5282b7d948708389e9f714f06d3f";
const COMPANY = {
    entity_type: "company",
    objective: "AI startups that raised Series A in 2024",
    limit: 3,
};

const run = async (fixture: string, body: Json = COMPANY) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}${fixture}.json`),
    });

type Output = {
    leads_search_id: string;
    status: string;
    stop_reason?: string;
    ready_count: number;
    count: number;
    entities: { name: string }[];
};

const NAMES = ["Contextual AI", "Vectara", "Lakera"];

Deno.test("lev8#v1/entity-search done (recorded): polls, fetches every ready entity, bills 5 + 3 × 2", async () => {
    const result = await run("entity-done");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // literal: standard startup 5 + 3 companies × 2 (guides/billing);
    // Lev8's balance moved by 11 for this recording
    assertEquals(result.usage, {
        credits: { default: 11 },
        evidence: { startup: 5, results: 3 },
    });
    const output = result.output as Output;
    assertEquals(output.leads_search_id, RECORDED_ID);
    assertEquals(output.status, "done");
    assertEquals(output.stop_reason, "limit");
    assertEquals(output.ready_count, 3);
    assertEquals(output.count, 3);
    assertEquals(output.entities.map((e) => e.name), NAMES);
    // one running tick, then the terminal one
    assertEquals(result.timing.attempts, 2);
});

Deno.test("lev8#v1/entity-search short page (synthetic): fetches again from pts + count", async () => {
    const result = await run("synthetic-entity-short-page");
    assertEquals(result.usage, {
        credits: { default: 11 },
        evidence: { startup: 5, results: 3 },
    });
    const output = result.output as Output;
    assertEquals(output.count, 3);
    assertEquals(output.entities.map((e) => e.name), NAMES);
});

Deno.test("lev8#v1/entity-search: the rate follows entity_type and enable_web_search", async () => {
    // Each row: body overrides, evidence, credits for the 3-entity chain —
    // literal, from docs.lev8.com/guides/billing (2026-10-16).
    const rows: [Record<string, Json>, Record<string, number>, number][] = [
        [{ entity_type: "person" }, { startup: 5, results: 3 }, 11],
        [{ entity_type: "shopify_store" }, { startup: 5, results: 3 }, 11],
        [
            { entity_type: "youtube_creator" },
            { startup: 5, creator_results: 3 },
            35,
        ],
        [
            { entity_type: "instagram_creator", enable_web_search: true },
            { startup: 20, creator_results: 3 },
            50,
        ],
        [
            { entity_type: "company", enable_web_search: true },
            { startup: 20, results: 3 },
            26,
        ],
        [
            { entity_type: "wechat", enable_web_search: true },
            { startup: 20, results: 3 },
            26,
        ],
    ];
    for (const [overrides, evidence, credits] of rows) {
        const result = await run("entity-done", {
            ...COMPANY,
            ...overrides,
        });
        assertEquals(result.usage, {
            credits: { default: credits },
            evidence,
        }, JSON.stringify(overrides));
    }
});

Deno.test("lev8#v1/entity-search error with results (synthetic): startup refunded, results still served and billed", async () => {
    const result = await run("synthetic-entity-error-partial");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { startup: 0, results: 1 },
    });
    const output = result.output as Output;
    assertEquals(output.status, "error");
    assertEquals(output.entities.length, 1);
});

Deno.test("lev8#v1/entity-search error with no results (synthetic): run fails, zero usage", async () => {
    const result = await run("synthetic-entity-error-empty");
    assertEquals(result.httpStatus, 500);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals((result.output as Output).leads_search_id, TASK_ID);
});

Deno.test("lev8#v1/entity-search create rejected (synthetic 422) and expired task (404): data, zero usage", async () => {
    const rejected = await run("synthetic-entity-create-rejected", {
        entity_type: "wechat",
        objective: "tea brands",
    });
    assertEquals(rejected.httpStatus, 422);
    assertEquals(rejected.isProviderError, true);
    assertEquals(rejected.usage, { credits: {}, evidence: {} });

    const expired = await run("synthetic-entity-status-expired");
    assertEquals(expired.httpStatus, 404);
    assertEquals(expired.isProviderError, true);
    assertEquals(expired.usage, { credits: {}, evidence: {} });
});

Deno.test("lev8#v1/entity-search provider error (recorded 401): data, zero usage", async () => {
    const result = await run("unauthorized");
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("lev8#v1/entity-search status 503 (synthetic): the poll throws instead of settling", async () => {
    // a failed lookup is not a finished task — the search may be running
    // and billing upstream (design D7)
    await assertRejects(
        () => run("synthetic-entity-status-unavailable"),
        Error,
        "503",
    );
});

Deno.test("lev8#v1/entity-search: estimate is Lev8's reservation — startup + limit × rate", async () => {
    const unit = await testSealedUnit(ID);
    const rows: [Record<string, Json>, Record<string, number>, number][] = [
        // default limit 20: 5 + 20 × 2
        [{ entity_type: "company" }, { startup: 5, results: 20 }, 45],
        [
            { entity_type: "tiktok_creator", limit: 50 },
            { startup: 5, creator_results: 50 },
            505,
        ],
        [
            { entity_type: "xiaohongshu", enable_web_search: true, limit: 10 },
            { startup: 20, results: 10 },
            40,
        ],
    ];
    for (const [overrides, evidence, credits] of rows) {
        assertEquals(
            await estimateEndpoint(unit, {
                body: { objective: "x", ...overrides },
            }),
            { credits: { default: credits }, evidence },
            JSON.stringify(overrides),
        );
    }
});

Deno.test("lev8#v1/entity-search: enum, limit 1–500, list caps, strict body", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}entity-done.json`,
    );
    const rejected: Json[] = [
        {},
        { entity_type: "company" },
        { objective: "x" },
        { entity_type: "linkedin_profile", objective: "x" },
        { entity_type: "company", objective: "" },
        { entity_type: "company", objective: "x", limit: 0 },
        { entity_type: "company", objective: "x", limit: 501 },
        {
            entity_type: "company",
            objective: "x",
            enrich_fields: Array.from({ length: 21 }, (_, i) => `f${i}`),
        },
        {
            entity_type: "company",
            objective: "x",
            dedup_lev8_leads: Array.from({ length: 101 }, (_, i) => `l${i}`),
        },
        { entity_type: "company", objective: "x", page: 2 },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body).slice(0, 80),
        );
    }
    await assertInputAccepted({
        unit,
        input: {
            body: {
                entity_type: "company",
                objective: "x",
                limit: 500,
                enrich_fields: null,
                dedup_lev8_leads: [TASK_ID],
                dedup_custom_leads: ["Figure AI"],
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "lev8#v1/entity-search live (gated on LEV8_API_KEY)",
    ignore: liveSkip("lev8"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    entity_type: "company",
                    objective: "AI startups that raised Series A in 2024",
                    limit: 2,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Output;
        assert(output.status === "done" || output.status === "error");
        assertEquals(output.count, output.entities.length);
        assert(output.ready_count <= 2);
    },
});
