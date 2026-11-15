import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "xquik#x/users/{id}/followers";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy: each returned follower draws 1 Xquik credit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: { pathParams: { id: "NASA" }, queryParams: { pageSize: 2 } },
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
        users: { username: string }[];
        next_cursor: unknown;
    };
    assertEquals(output.users.length, 2);
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

Deno.test(`${ID} estimate: the page size is the promise, 200 by default`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, { pathParams: { id: "NASA" } }),
        { credits: { default: 200 }, evidence: { RESULT: 200 } },
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

Deno.test({
    name: `${ID} live (gated on XQUIK_API_KEY)`,
    ignore: liveSkip("xquik"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { id: "NASA" }, queryParams: { pageSize: 1 } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const rows = (result.output as { users: unknown[] }).users.length;
        assertEquals(result.usage.evidence, { RESULT: rows });
    },
});
