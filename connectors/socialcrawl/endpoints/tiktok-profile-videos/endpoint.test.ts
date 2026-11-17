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
const ID = "socialcrawl#v1/tiktok/profile/videos";

Deno.test("socialcrawl#v1/tiktok/profile/videos happy: 1 credit, two videos, meter absorbed", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { handle: "charlidamelio" } },
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
    const items = (output.data as { items: unknown[] }).items;
    assertEquals(items.length, 2);
});

Deno.test("socialcrawl#v1/tiktok/profile/videos: a paid label raises the ceiling to 5", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { handle: "charlidamelio" },
        })).credits,
        { default: 1 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { handle: "charlidamelio", label: "mention" },
        })).credits,
        { default: 1 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: {
                handle: "charlidamelio",
                label: "mention",
                brand: "Buldak",
            },
        })).credits,
        { default: 5 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { handle: "charlidamelio", label: "quality" },
        })).credits,
        { default: 5 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { handle: "charlidamelio", dry_run: 1 },
        })).credits,
        {},
    );
});

Deno.test("socialcrawl#v1/tiktok/profile/videos: schema gate", async () => {
    const unit = await testSealedUnit(ID);
    await assertRejects(
        () => estimateEndpoint(unit, { queryParams: {} }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () =>
            estimateEndpoint(unit, {
                queryParams: { handle: "charlidamelio", max_pages: 0 },
            }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { handle: "charlidamelio", max_pages: 1 },
        })).credits,
        { default: 1 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { user_id: "user_3182ec" },
        })).credits,
        { default: 1 },
    );
});

Deno.test("socialcrawl#v1/tiktok/profile/videos provider error: 401 is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { handle: "charlidamelio" } },
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
        "socialcrawl#v1/tiktok/profile/videos live (gated on SOCIALCRAWL_API_KEY)",
    ignore: liveSkip("socialcrawl"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { handle: "charlidamelio" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(
            typeof result.usage.credits.default,
            result.usage.evidence.CREDIT === 0 ? "undefined" : "number",
        );
    },
});
