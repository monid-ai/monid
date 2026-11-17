import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "xquik#x/tweets/{id}";
const TWEET_ID = "2121280846183137564";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy: 1 tweet draws 1 Xquik credit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: TWEET_ID } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
    const output = result.output as {
        tweet: { id: string };
        author: { username: string };
    };
    assertEquals(output.tweet.id, TWEET_ID);
    assertEquals(output.author.username, "NASA");
});

Deno.test(`${ID} provider error: 404 is data, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "1" } },
        mode: "replay",
        fixture,
    });

    assertEquals(result.httpStatus, 404);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID}: a missing id fails INVALID_INPUT, an id passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () => runEndpoint({ unit, input: {}, mode: "replay", fixture }),
        Error,
        "INVALID_INPUT",
    );
    assertEquals(
        await estimateEndpoint(unit, { pathParams: { id: TWEET_ID } }),
        { credits: { default: 1 }, evidence: { CALL: 1 } },
    );
});

Deno.test(`${ID}: a bare search or top fails INVALID_INPUT, the 2121280846183137564 form passes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    for (const id of ["search", "top"]) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { pathParams: { id } },
                    mode: "replay",
                    fixture,
                }),
            Error,
            "INVALID_INPUT",
        );
    }
    assertEquals(
        (await estimateEndpoint(unit, {
            pathParams: { id: "2121280846183137564" },
        }))
            .evidence,
        { CALL: 1 },
    );
});

Deno.test({
    name: `${ID} live (gated on XQUIK_API_KEY)`,
    ignore: liveSkip("xquik"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { id: TWEET_ID } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(result.usage.evidence, { CALL: 1 });
        const output = result.output as {
            tweet: { id: unknown; text: unknown };
        };
        assertEquals(typeof output.tweet.id, "string");
        assertEquals(typeof output.tweet.text, "string");
    },
});
