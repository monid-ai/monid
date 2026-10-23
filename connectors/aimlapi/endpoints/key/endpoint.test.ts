import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "aimlapi#key";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test(`${ID} happy (recorded): scopes and month-to-date spend, free`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture: await loadFixture(`${chains}key-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });

    const output = result.output as Record<string, unknown>;
    const data = output.data as Record<string, unknown>;
    assertEquals(data.disabled, false);
    assertEquals(data.scopes, [
        "model:chat",
        "model:image",
        "model:embeddings",
    ]);
    // the credit/dollar pair the metered endpoints bill against: the
    // gateway's own figures give 2,000,000 credits per US dollar
    const credits = data.monthly_usage as number;
    const dollars = data.monthly_usage_usd as number;
    assertEquals(Math.round(credits / dollars), 2_000_000);
});

Deno.test(`${ID} provider error (recorded 401 on a GET): zero usage, digested error`, async () => {
    const unit = await testSealedUnit(ID);
    const result = await runEndpoint({
        unit,
        input: {},
        mode: "replay",
        fixture: await loadFixture(`${chains}unauthorized-get.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(
        (output.message as string).startsWith(
            "This request requires a valid API key",
        ),
        true,
    );
});

Deno.test({
    name: `${ID} live (gated on AIMLAPI_API_KEY)`,
    ignore: liveSkip("aimlapi"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: {},
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.usage),
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
        const output = result.output as Record<string, unknown>;
        const data = output.data as Record<string, unknown>;
        // shape and the invariant, never the account's actual figures
        assertEquals(Array.isArray(data.scopes), true);
        assertEquals(typeof data.disabled, "boolean");
        assertEquals(typeof data.monthly_usage_usd, "number");
        // the key the suite runs with must be able to reach chat, or the
        // other live tests are testing the wrong thing
        assertEquals(
            (data.scopes as string[]).includes("model:chat"),
            true,
        );
        // the credits-per-dollar constant, re-checked against the live
        // account rather than the fixture
        const credits = data.total_usage as number;
        const dollars = data.total_usage_usd as number;
        if (dollars > 0) {
            assertEquals(Math.round(credits / dollars), 2_000_000);
        }
    },
});
