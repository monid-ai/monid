import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const ID = "akta#v1/company/enrichment";

Deno.test("akta#v1/company/enrichment happy (recorded): one firmographic section, the vendor's 2 credits", async () => {
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            queryParams: {
                company: "https://canva.com",
                sections: ["firmographic"],
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // the claim (credits_consumed 2) and the fold (1 section at 2) agree, so
    // no mismatch rides out
    assertEquals(result.usage, {
        credits: { default: 2 },
        evidence: { firmographic: 1 },
    });
    // the vendor meter is absorbed out of the payload; the section arrives
    const output = result.output as Record<string, Json>;
    assertEquals("credits_consumed" in output, false);
    const data = output.data as Record<string, Json>;
    assertEquals(Object.keys(data).sort(), ["firmographic", "uuid"]);
});

Deno.test("akta#v1/company/enrichment happy (synthetic): management_profile settles at v1's 1 credit", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            queryParams: {
                company: "canva.com",
                sections: ["management_profile"],
            },
        },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-management-profile.json`,
        ),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { management_profile: 1 },
    });
});

Deno.test("akta#v1/company/enrichment provider error (synthetic 401): zero usage", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            queryParams: { company: "canva.com", sections: ["firmographic"] },
        },
        mode: "replay",
        fixture: await loadFixture(
            `${fixturesDir}synthetic-provider-error.json`,
        ),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("akta#v1/company/enrichment schema gate: sections is required and non-empty (v1 parity)", async () => {
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

Deno.test({
    name: "akta#v1/company/enrichment live (gated on AKTA_API_KEY)",
    ignore: liveSkip("akta"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                queryParams: {
                    company: "canva.com",
                    sections: ["firmographic"],
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        // one requested section → one evidence line, and the meter is gone
        assertEquals(Object.keys(result.usage.evidence), ["firmographic"]);
        const output = result.output as Record<string, Json>;
        assertEquals("credits_consumed" in output, false);
        assertEquals(
            typeof (output.data as Record<string, Json>).firmographic,
            "object",
        );
    },
});
