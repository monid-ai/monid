import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "bloomberry#accounts/tech.json";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): 2 credits per company; size bands go ';'-separated`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                vendor_name: "Clay Web Intent",
                company_employee_size_range: ["11-50", "51-200"],
                limit: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 4 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as {
        users: { domain: string; vendor_name: string }[];
    };
    assertEquals(output.users.length, 2);
    assertEquals(output.users[0].vendor_name, "Clay Web Intent");
});

Deno.test(`${ID} estimate: page size × 2 credits; the vendor maximum (20) passes`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, {
            queryParams: { vendor_name: "Clay Web Intent", limit: 2 },
        }),
        { credits: { default: 4 }, evidence: { RESULT: 2 } },
    );
    assertEquals(
        await estimateEndpoint(unit, {
            queryParams: { vendor_name: "Clay Web Intent", limit: 20 },
        }),
        { credits: { default: 40 }, evidence: { RESULT: 20 } },
    );
});

Deno.test(`${ID}: limit above the vendor's 20-row page is rejected`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: {
                    queryParams: { vendor_name: "Clay Web Intent", limit: 21 },
                },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
});

Deno.test(`${ID} provider error (recorded 401): zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}provider-error.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { vendor_name: "Clay Web Intent", limit: 2 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test(`${ID} empty (recorded): no matching company bills nothing`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}empty.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                vendor_name: "Clay Web Intent",
                company_country: ["AQ"],
                limit: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // zero delivered ⇒ nothing folds: a zero line prunes out of the
    // credits map, the evidence still says what was counted
    assertEquals(result.usage, {
        credits: {},
        evidence: { RESULT: 0 },
    });
    assertEquals((result.output as { users: unknown[] }).users, []);
});

Deno.test({
    name:
        `${ID} live (gated on BLOOMBERRY_CREDENTIALS_API_KEY; spends up to 2 credits)`,
    ignore: liveSkip("bloomberry"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {
                queryParams: { vendor_name: "Clay Web Intent", limit: 1 },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence), ["RESULT"]);
    },
});
