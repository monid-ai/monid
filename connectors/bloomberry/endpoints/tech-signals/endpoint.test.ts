import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "bloomberry#signals/tech.json";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): 10 credits per change; arrays go ';'-separated`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                vendor_name: "Clay Web Intent",
                new_only: true,
                // ARRAY in the schema — the provider toRequest joins to
                // "US;GB" (the fixture URL proves the wire form)
                company_country: ["US", "GB"],
                limit: 2,
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // PER_UNIT: 2 signals delivered × 10 credits
    assertEquals(result.usage, {
        credits: { default: 20 },
        evidence: { RESULT: 2 },
    });
    const output = result.output as {
        signals: { change_type: string; vendor_name: string }[];
        pagination: { next_token?: string };
    };
    assertEquals(output.signals.length, 2);
    assertEquals(output.signals[0].vendor_name, "Clay Web Intent");
    assertEquals(typeof output.pagination.next_token, "string");
});

Deno.test(`${ID} estimate: the page size is the promise; the vendor default (20) applies when omitted`, async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, {
            queryParams: { vendor_name: "Clay Web Intent", limit: 3 },
        }),
        { credits: { default: 30 }, evidence: { RESULT: 3 } },
    );
    assertEquals(
        await estimateEndpoint(unit, {
            queryParams: { vendor_name: "Clay Web Intent" },
        }),
        { credits: { default: 200 }, evidence: { RESULT: 20 } },
    );
});

Deno.test(`${ID} domain (recorded): one company's own changes`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}domain.json`);
    const result = await runEndpoint({
        unit,
        input: { queryParams: { domain: "unifygtm.com", limit: 5 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    const output = result.output as { signals: { domain: string }[] };
    // the recorder trims arrays to 2 — settle counts what the fixture holds
    assertEquals(output.signals.length, 2);
    assertEquals(output.signals[0].domain, "unifygtm.com");
    assertEquals(result.usage, {
        credits: { default: 20 },
        evidence: { RESULT: 2 },
    });
});

Deno.test(`${ID} unknown vendor (recorded): HTTP 200 with an error body settles as 422, zero usage`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}unknown-vendor.json`);
    const result = await runEndpoint({
        unit,
        input: {
            queryParams: {
                vendor_name: "Clay",
                new_only: true,
                company_country: ["US", "GB"],
                limit: 3,
            },
        },
        mode: "replay",
        fixture,
    });
    // in-band failure: OURS 422 over THEIRS 200 (design D12)
    assertEquals(result.httpStatus, 422);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(
        (result.output as { error: string }).error,
        "That vendor does not exist in our database",
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
        input: { queryParams: { vendor_name: "Clay", limit: 3 } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name:
        `${ID} live (gated on BLOOMBERRY_CREDENTIALS_API_KEY; spends up to 10 credits)`,
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
