import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const ID = "hunterio#email-finder";
const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const INPUT = {
    queryParams: {
        domain: "reddit.com",
        first_name: "Alexis",
        last_name: "Ohanian",
    },
};

Deno.test(`${ID} happy (synthetic): an address found: 1 credit`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { RESULT: 1 },
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test(`${ID} a miss (200, email null): free (synthetic)`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-miss.json`);
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
});

Deno.test(`${ID} provider error (synthetic 401): zero usage, the errors envelope digested`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${fixturesDir}synthetic-provider-error.json`,
    );
    const result = await runEndpoint({
        unit,
        input: INPUT,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as { message: string; error_code: string };
    assertEquals(output.error_code, "invalid_api_key");
    assertEquals(output.message, "The API key is invalid.");
});

Deno.test(`${ID}: the schema gate — the vendor's rules and strictness`, async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${fixturesDir}synthetic-happy.json`);
    const run = (input: Record<string, unknown>) =>
        runEndpoint({
            unit,
            input: { queryParams: input as Record<string, Json> },
            mode: "replay",
            fixture,
        });
    for (
        const bad of [
            {},
            { first_name: "Alexis", last_name: "Ohanian" },
            { domain: "reddit.com", first_name: "Alexis" },
            { domain: "reddit.com" },
            {
                domain: "reddit.com",
                full_name: "Alexis Ohanian",
                max_duration: 21,
            },
            { linkedin_handle: "alexisohanian", email: "a@b.co" },
        ]
    ) {
        await assertRejects(() => run(bad), Error, "INVALID_INPUT");
    }
    {
        // the near twin passes the gate and fails later, at replay URL
        // matching — proving validation let it through
        const err = await assertRejects(
            () => run({ linkedin_handle: "alexisohanian" }),
            Error,
        );
        assertEquals(err.message.includes("INVALID_INPUT"), false, err.message);
    }
    {
        // the near twin passes the gate and fails later, at replay URL
        // matching — proving validation let it through
        const err = await assertRejects(
            () =>
                run({
                    company: "Reddit",
                    full_name: "Alexis Ohanian",
                    max_duration: 20,
                }),
            Error,
        );
        assertEquals(err.message.includes("INVALID_INPUT"), false, err.message);
    }
});

Deno.test({
    name: `${ID} live (gated on HUNTERIO_API_KEY)`,
    ignore: liveSkip("hunterio"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: INPUT,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 500),
        );
        assertEquals(
            Object.prototype.toString.call(result.output) === "[object Object]",
            true,
        );
    },
});
