import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "xquik#x/users/{id}/tweets";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy: each returned tweet draws 1 Xquik credit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { id: "NASA" },
            queryParams: { retweets: "exclude", pageSize: 2 },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 2 },
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

Deno.test(`${ID} provider error: 404 user_not_found is data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "xq_no_user_404" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} estimate: the page size is the promise, 20 by default`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, { pathParams: { id: "NASA" } }),
        { credits: { default: 20 }, evidence: { RESULT: 20 } },
    );
});

Deno.test(`${ID}: pageSize above 10,000 fails INVALID_INPUT, 10,000 passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    pathParams: { id: "NASA" },
                    queryParams: { pageSize: 10001 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            pathParams: { id: "NASA" },
            queryParams: { pageSize: 10000 },
        }))
            .evidence,
        { RESULT: 10000 },
    );
});

Deno.test(`${ID}: a bare batch fails INVALID_INPUT, the @batch form passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { id: "batch" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        (await estimateEndpoint(unit, { pathParams: { id: "@batch" } }))
            .evidence,
        { RESULT: 20 },
    );
});

const CURSOR_INPUT = {
    pathParams: { id: "NASA" },
    queryParams: {
        retweets: "exclude",
        pageSize: 2,
        cursor: "xqcv1_ENbu9Q_YOWF9uFW5R1a9JGCS8T5TAxGpMIfkMQ4_fwk.1",
    },
};

Deno.test(`${ID}: a cursor page settles its rows, & the same page sent again settles 0`, async () => {
    const unit = await testSealedUnit(ID);
    const paid = await loadFixture(`${fixturesDir}cursor-page.json`);
    const replayed = await loadFixture(`${fixturesDir}replayed-cursor.json`);
    const first = await runEndpoint({
        unit,
        input: CURSOR_INPUT,
        mode: "replay",
        fixture: paid,
    });
    const again = await runEndpoint({
        unit,
        input: CURSOR_INPUT,
        mode: "replay",
        fixture: replayed,
    });

    assertEquals(first.usage, {
        credits: { default: 2 },
        evidence: { RESULT: 2 },
    });
    assertEquals(again.httpStatus, 200);
    assertEquals(again.isProviderError, false);
    assertEquals(again.usage, { credits: {}, evidence: { RESULT: 0 } });
    assertEquals(again.output, first.output);
    assertEquals((again.output as { tweets: unknown[] }).tweets.length, 2);
});

Deno.test(`${ID}: sinceId reads only tweets newer than the one sent`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}since-id.json`);
    const sinceId = "2120974110335312297";
    const result = await runEndpoint({
        unit,
        input: {
            pathParams: { id: "NASA" },
            queryParams: { retweets: "exclude", pageSize: 2, sinceId },
        },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
    const ids = (result.output as { tweets: { id: string }[] }).tweets
        .map((tweet) => BigInt(tweet.id));
    assertEquals(ids.length, 1);
    assertEquals(ids.every((id) => id > BigInt(sinceId)), true);
});

Deno.test(`${ID}: sinceId & maxId take tweet IDs up to 19 characters, keywords pass`, async () => {
    const unit = await testSealedUnit(ID);
    for (const key of ["sinceId", "maxId"]) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: {
                        pathParams: { id: "NASA" },
                        queryParams: { [key]: "1".repeat(20) },
                    },
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    assertEquals(
        (await estimateEndpoint(unit, {
            pathParams: { id: "NASA" },
            queryParams: {
                sinceId: "2120974110335312297",
                maxId: "2121280846183137564",
                keywords: "moon",
            },
        })).evidence,
        { RESULT: 20 },
    );
});

Deno.test({
    name: `${ID} live (gated on XQUIK_API_KEY)`,
    ignore: liveSkip("xquik"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const first = await runEndpoint({
            unit,
            input: { pathParams: { id: "NASA" }, queryParams: { pageSize: 1 } },
            mode: "live",
        });
        assertEquals(
            first.isProviderError,
            false,
            JSON.stringify(first.output),
        );
        const page = first.output as {
            tweets: unknown[];
            next_cursor: string;
        };
        assertEquals(first.usage.evidence, { RESULT: page.tweets.length });
        const next = {
            pathParams: { id: "NASA" },
            queryParams: { pageSize: 1, cursor: page.next_cursor },
        };
        const sent = await runEndpoint({ unit, input: next, mode: "live" });
        const again = await runEndpoint({ unit, input: next, mode: "live" });
        assertEquals(sent.usage.evidence, {
            RESULT: (sent.output as { tweets: unknown[] }).tweets.length,
        });
        assertEquals(again.usage, { credits: {}, evidence: { RESULT: 0 } });
        assertEquals(again.output, sent.output);
    },
});
