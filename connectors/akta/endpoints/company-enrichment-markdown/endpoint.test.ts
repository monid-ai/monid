import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "akta#v1/company/enrichment/markdown";

Deno.test("akta#v1/company/enrichment/markdown happy (synthetic): one count per section in sections_included (two 0.5-credit sections)", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            queryParams: {
                company: "canva.com",
                sections: ["trust_signal", "location"],
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${fixturesDir}synthetic-happy.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { trust_signal: 1, location: 1 },
    });
    // the vendor meter is absorbed out of the payload
    const output = result.output as Record<string, unknown>;
    assertEquals("credits_consumed" in output, false);
});

Deno.test("akta#v1/company/enrichment/markdown estimate: matches the settled card", async () => {
    const usage = await estimateEndpoint(
        await testSealedUnit(ID),
        {
            queryParams: {
                company: "canva.com",
                sections: ["trust_signal", "location"],
            },
        },
    );
    assertEquals(usage, {
        credits: { default: 1 },
        evidence: { trust_signal: 1, location: 1 },
    });
});

Deno.test("akta#v1/company/enrichment/markdown schema gate: sections is required and non-empty (v1 parity)", async () => {
    const unit = await testSealedUnit(ID);
    for (
        const [why, queryParams] of [
            ["no sections", { company: "canva.com" }],
            ["empty sections", { company: "canva.com", sections: [] }],
        ] as [string, Record<string, Json>][]
    ) {
        await assertRejects(
            () => runEndpoint({ unit, input: { queryParams }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    }
    for (
        const queryParams of [
            { company: "canva.com", sections: ["firmographic"] },
        ] as Record<string, Json>[]
    ) {
        await assertInputAccepted({
            unit,
            input: { queryParams },
            mode: "replay",
        });
    }
});
