import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "outbound-dev#companies/resolve";

const run = async (fixture: string, body: Json) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("outbound-dev#companies/resolve: a domain resolves to one company, free", async () => {
    const result = await run("synthetic-company-resolve-found.json", {
        domain: "halden-freight.example",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "found");
    assertEquals(
        (output.company as Record<string, unknown>).name,
        "Halden Freight",
    );
});

Deno.test("outbound-dev#companies/resolve: nothing matching is a 200 not_found, never an error", async () => {
    const result = await run("synthetic-company-resolve-not-found.json", {
        name: "No Such Company Anywhere",
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.output, { status: "not_found", company: null });
});

Deno.test("outbound-dev#companies/resolve: a refusal is zero-billed data", async () => {
    const result = await run("synthetic-rate-limited.json", {
        name: "Halden Freight",
    });
    assertEquals(result.httpStatus, 429);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("outbound-dev#companies/resolve: the gate rejects no identifier and an unknown one, and passes a LinkedIn URL", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(
        `${chains}synthetic-company-resolve-found.json`,
    );
    const refused: Json[] = [{}, { website: "halden-freight.example" }];
    for (const body of refused) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    }
    await assertInputAccepted({
        unit,
        input: {
            body: {
                linkedinUrl: "https://www.linkedin.com/company/halden-freight",
            },
        },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name:
        "outbound-dev#companies/resolve live: a domain answers found or not_found",
    ignore: liveSkip("outbound-dev"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { domain: "outbound.dev" } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const output = result.output as Record<string, unknown>;
        assert(output.status === "found" || output.status === "not_found");
    },
});
