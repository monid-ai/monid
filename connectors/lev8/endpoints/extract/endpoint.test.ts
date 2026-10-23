import { assertEquals, assertRejects } from "@std/assert";
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
const ID = "lev8#v1/extract";
const WEB2LIST = {
    type: "web2list",
    target: "https://www.forbes.com/30-under-30/2026/ai",
    instruction: "Extract name and company",
};

Deno.test("lev8#v1/extract list (recorded): 7 items bill ceil(7/5) = 2 credits", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: {
                type: "github_repo_contributors",
                target: "denoland/deno",
                limit: 7,
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}extract-list.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { list_items: 7 },
    });
    assertEquals((result.output as { data: unknown[] }).data.length, 7);
});

Deno.test("lev8#v1/extract web2list (recorded): flat 80 on success, even with no rows", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: WEB2LIST },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}extract-web2list.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 80 },
        evidence: { web2list: 1 },
    });
});

Deno.test("lev8#v1/extract business failure (synthetic): success false bills 0 on either line", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-extract-failed.json`,
    );
    const list = await runEndpoint({
        unit,
        input: { body: { type: "x_followers", target: "no_such_account_x" } },
        mode: "replay",
        fixture,
    });
    assertEquals(list.httpStatus, 200);
    assertEquals(list.usage, { credits: {}, evidence: { list_items: 0 } });
    const web = await runEndpoint({
        unit,
        input: { body: WEB2LIST },
        mode: "replay",
        fixture,
    });
    assertEquals(web.usage, { credits: {}, evidence: { web2list: 0 } });
});

Deno.test("lev8#v1/extract provider error (recorded 401): data, zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { type: "github_repo_stargazers", target: "a/b" } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}unauthorized.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("lev8#v1/extract: estimate mirrors Lev8's reservation", async () => {
    const unit = await testSealedUnit(ID);
    // default limit 100 → 20 credits
    assertEquals(
        await estimateEndpoint(unit, {
            body: { type: "tiktok_followers", target: "openai" },
        }),
        { credits: { default: 20 }, evidence: { list_items: 100 } },
    );
    // limit 12 → ceil(12/5) = 3
    assertEquals(
        await estimateEndpoint(unit, {
            body: { type: "ins_following", target: "openai", limit: 12 },
        }),
        { credits: { default: 3 }, evidence: { list_items: 12 } },
    );
    // web2list ignores limit
    assertEquals(
        await estimateEndpoint(unit, { body: { ...WEB2LIST, limit: 10000 } }),
        { credits: { default: 80 }, evidence: { web2list: 1 } },
    );
});

Deno.test("lev8#v1/extract: type enum, target 1–2048, limit 1–10000, strict body", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}extract-list.json`,
    );
    const rejected: Json[] = [
        {},
        { type: "x_followers" },
        { target: "sama" },
        { type: "linkedin_followers", target: "sama" },
        { type: "x_followers", target: "" },
        { type: "x_followers", target: "x".repeat(2049) },
        { type: "x_followers", target: "sama", limit: 0 },
        { type: "x_followers", target: "sama", limit: 10001 },
        { type: "x_followers", target: "sama", instruction: "x".repeat(4001) },
        { type: "x_followers", target: "sama", cursor: "abc" },
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
                type: "x_followers",
                target: "sama",
                instruction: null,
                limit: 10000,
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "lev8#v1/extract live (gated on LEV8_API_KEY)",
    ignore: liveSkip("lev8"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    type: "github_repo_contributors",
                    target: "denoland/deno",
                    limit: 5,
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["list_items"]);
    },
});
