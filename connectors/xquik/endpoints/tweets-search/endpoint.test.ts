import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "xquik#x/tweets/search";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const happyInput = {
    queryParams: { q: "from:NASA", retweets: "exclude", limit: 2 },
};

Deno.test(`${ID} happy: each returned tweet bills $0.00015`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: happyInput,
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 * 0.00015 },
        evidence: { RESULT: 2 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as {
        tweets: { author: { username: string } }[];
        next_cursor: unknown;
    };
    assertEquals(output.tweets.length, 2);
    assertEquals(output.tweets[0].author.username, "NASA");
    assertEquals(typeof output.next_cursor, "string");
});

Deno.test(`${ID} provider error: 400 missing_query is data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: {} },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { error: string }).error,
        "missing_query",
    );
});

Deno.test(`${ID} estimate: the limit is the promise, 20 by default`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(await estimateEndpoint(unit, { queryParams: { q: "nasa" } }), {
        credits: { default: 20 * 0.00015 },
        evidence: { RESULT: 20 },
    });
    assertEquals(
        await estimateEndpoint(unit, {
            queryParams: { q: "nasa", limit: 10000 },
        }),
        {
            credits: { default: 10000 * 0.00015 },
            evidence: { RESULT: 10000 },
        },
    );
});

Deno.test(`${ID}: a limit above 10,000 fails INVALID_INPUT`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { q: "nasa", limit: 10001 } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test(`${ID}: a parameter outside the schema fails INVALID_INPUT, a declared filter passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { queryParams: { q: "nasa", topic: "space" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            queryParams: { q: "nasa", minLikes: 5 },
        })).evidence,
        { RESULT: 20 },
    );
});

Deno.test({
    name: `${ID} live (gated on XQUIK_API_KEY)`,
    ignore: liveSkip("xquik"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { queryParams: { q: "from:NASA", limit: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const rows = (result.output as { tweets: unknown[] }).tweets.length;
        assertEquals(result.usage.evidence, { RESULT: rows });
    },
});
