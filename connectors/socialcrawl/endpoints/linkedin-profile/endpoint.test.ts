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
const ID = "socialcrawl#v1/linkedin/profile";
const URL_ = "https://www.linkedin.com/in/williamhgates/";

Deno.test("socialcrawl#v1/linkedin/profile happy: 5 credits, profile rides through", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        unit.doc.request.url,
        "https://www.socialcrawl.dev/v1/linkedin/profile",
    );
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: URL_ } },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 5 },
        evidence: { CREDIT: 5 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_used" in output, false);
    assertEquals("credits_remaining" in output, false);
    const author = (output.data as { author: { display_name: string } })
        .author;
    assertEquals(author.display_name, "Bill Gates");
});

Deno.test("socialcrawl#v1/linkedin/profile: schema gate", async () => {
    const unit = await testSealedUnit(ID);
    await assertRejects(
        () => estimateEndpoint(unit, { queryParams: { url: "" } }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () => estimateEndpoint(unit, { queryParams: { url: "not-a-url" } }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        (await estimateEndpoint(unit, { queryParams: { url: URL_ } })).credits,
        { default: 5 },
    );
});

Deno.test("socialcrawl#v1/linkedin/profile: the hold is 5, and a dry run is free", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        (await estimateEndpoint(unit, { queryParams: { url: URL_ } })).credits,
        { default: 5 },
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { url: URL_, dry_run: 1 },
        })).credits,
        {},
    );
});

Deno.test("socialcrawl#v1/linkedin/profile provider error: 401 is data, zero usage", async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: URL_ } },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        ),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "socialcrawl#v1/linkedin/profile live (gated on SOCIALCRAWL_API_KEY)",
    ignore: liveSkip("socialcrawl"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { url: URL_ } },
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
