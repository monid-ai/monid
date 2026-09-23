import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { BRIGHTDATA_KEYS } from "../../schema/auth.ts";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

Deno.test("brightdata#serp happy: no vendor meter, so the flat fold settles the run", async () => {
    const unit = await testSealedUnit("brightdata#serp");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://www.google.com/search?q=solid+state+battery+suppliers&brd_json=1",
                format: "raw",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}serp-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // Bright Data reports NO meter (design D3), so there is no claim to win:
    // the derived flat $0.0015 stands alone and nothing rides as mismatch.
    assertEquals(result.usage, {
        credits: { default: 0.0015 },
        evidence: { CALL: 1 },
    });
    assertEquals(result.usage.mismatch, undefined);
    // the parsed results page rides through untouched — no fromResponse
    const output = result.output as Record<string, unknown>;
    assertEquals((output.organic as unknown[]).length, 2);
    assertEquals(
        (output.general as Record<string, unknown>).search_engine,
        "google",
    );
});

Deno.test("brightdata#serp: the zone is credential material, absent from the caller's schema", async () => {
    const unit = await testSealedUnit("brightdata#serp");
    const properties = unit.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    // design D1: the vendor REQUIRES `zone` on the wire; auth.inject supplies
    // it at egress, so it must never be a caller argument
    assert(
        !("zone" in properties),
        "zone must not be in the caller-facing schema",
    );
    assertEquals(unit.doc.input.schema.body?.required, ["url", "format"]);
    // and it IS declared as credential material, one field per zone type
    assertEquals(BRIGHTDATA_KEYS, ["apiKey", "serpZone", "unlockerZone"]);
});

Deno.test("brightdata#serp: flat billing, whatever the page returns", async () => {
    const unit = await testSealedUnit("brightdata#serp");
    // result count is not a billing input — no metered line, no estimate fn
    const model = unit.doc.usage.model;
    assert(model.kind === "PER_CALL", "serp must be flat-rated");
    assertEquals(model.consumes, { credit: "default", amount: 0.0015 });
});

Deno.test("brightdata#serp provider error: a rejected key is a plain-text 401, zero usage", async () => {
    const unit = await testSealedUnit("brightdata#serp");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://www.google.com/search?q=pizza",
                format: "raw",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}invalid-token.json`),
    });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    // design D5: Bright Data's errors are bare strings, and a string IS Json —
    // the sniffing decode renders it faithfully and no fromError reshapes it
    assertEquals(result.output, "Invalid token");
});

Deno.test({
    name:
        "brightdata#serp live (gated on BRIGHTDATA_CREDENTIALS_{API_KEY,SERP_ZONE,UNLOCKER_ZONE})",
    ignore: liveSkip("brightdata", BRIGHTDATA_KEYS),
    fn: async () => {
        const unit = await testSealedUnit("brightdata#serp");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    url: "https://www.google.com/search?q=deno+2+workspace&brd_json=1",
                    format: "raw",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 400),
        );
        // the rate is pinned, not vendor-reported: no meter exists to read
        assertEquals(result.usage, {
            credits: { default: 0.0015 },
            evidence: { CALL: 1 },
        });
        const output = result.output as Record<string, unknown>;
        assert(Array.isArray(output.organic), "live SERP must parse to fields");
    },
});
