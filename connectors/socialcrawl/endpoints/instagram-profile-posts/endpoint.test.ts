import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "socialcrawl#v1/instagram/profile/posts";

Deno.test("socialcrawl#v1/instagram/profile/posts happy: credits_used settles, billing fields leave the payload", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { handle: "instagram" } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_used" in output, false);
    assertEquals("credits_remaining" in output, false);
    const data = output.data as { items: { post: { id: string } }[] };
    assertEquals(data.items.length, 1);
    assertEquals(data.items[0].post.id, "3998430248382584993");
    assertEquals(
        (output.pagination as { has_more: boolean }).has_more,
        true,
    );
});

Deno.test("socialcrawl#v1/instagram/profile/posts cache hit: a zero receipt settles at zero", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { handle: "instagram" } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-cache-hit.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { CREDIT: 0 } });
    assertEquals(
        "credits_used" in (result.output as Record<string, unknown>),
        false,
    );
});

Deno.test("socialcrawl#v1/instagram/profile/posts: the estimate is the page ceiling", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        (await estimateEndpoint(unit, { queryParams: { handle: "instagram" } }))
            .credits,
        { default: 1 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { handle: "instagram", include: "audio,tags" },
        })).credits,
        { default: 25 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: {
                handle: "instagram",
                include: "audio",
                max_pages: 2,
            },
        })).credits,
        { default: 26 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: {
                handle: "instagram",
                include: "audio,tags",
                max_credits: 10,
            },
        })).credits,
        { default: 10 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { handle: "instagram", dry_run: 1 },
        })).credits,
        {},
    );
    // mention is not billed unless brand is set. quality is billed alone.
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { handle: "instagram", label: "mention" },
        })).credits,
        { default: 1 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: {
                handle: "instagram",
                label: "mention",
                brand: "Buldak",
            },
        })).credits,
        { default: 5 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { handle: "instagram", since: "2026-09-01" },
        })).credits,
        { default: 1 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: {
                handle: "instagram",
                until: "2026-10-01T15:59:45.000Z",
            },
        })).credits,
        { default: 1 },
    );
});

Deno.test("socialcrawl#v1/instagram/profile/posts: schema gate", async () => {
    const unit = await testSealedUnit(ID);
    await assertRejects(
        () =>
            estimateEndpoint(unit, {
                queryParams: { handle: "" },
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            estimateEndpoint(unit, {
                queryParams: { handle: "instagram", since: "yesterday" },
            }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        (await estimateEndpoint(unit, { queryParams: { handle: "instagram" } }))
            .credits,
        { default: 1 },
    );
});

Deno.test("socialcrawl#v1/instagram/profile/posts provider error: 401 is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { handle: "instagram" } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        ),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { code: string }).code,
        "INVALID_API_KEY",
    );
});

Deno.test({
    name:
        "socialcrawl#v1/instagram/profile/posts live (gated on SOCIALCRAWL_API_KEY)",
    ignore: liveSkip("socialcrawl"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { handle: "instagram" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // A cache hit reports credits_used 0. That claim is pruned, so
        // credits.default is absent and the evidence count is 0.
        assertEquals(
            typeof result.usage.credits.default,
            result.usage.evidence.CREDIT === 0 ? "undefined" : "number",
        );
        assertEquals(
            "credits_used" in (result.output as Record<string, unknown>),
            false,
        );
    },
});
