import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";
import { BRIGHTDATA_KEYS } from "../../schema/auth.ts";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

/** Validate-only run: the estimate derives the input without IO, so a
 *  rejecting transport proves whether a body passes the compiled gate
 *  (the litescrape idiom). */
const validates = async (body: Record<string, Json>) => {
    const engine = new Engine({
        transport: directTransport({
            params: () =>
                Promise.resolve({
                    apiKey: "test-key",
                    serpZone: "test-serp-zone",
                    unlockerZone: "test-unlocker-zone",
                }),
            fetch: () => Promise.reject(new Error("estimate must not IO")),
        }),
    });
    const loaded = await engine.load(await testSealedUnit("brightdata#serp"));
    return await loaded.estimate({ body });
};

const rejects = (body: Record<string, Json>) =>
    assertRejects(() => validates(body), Error, "INVALID_INPUT");

Deno.test("brightdata#serp happy: no vendor meter, so the derived fold settles the run", async () => {
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
        evidence: { RESULT: 1 },
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

Deno.test("brightdata#serp: one rate per DELIVERED request — result count is not a billing input", async () => {
    const unit = await testSealedUnit("brightdata#serp");
    const model = unit.doc.usage.model;
    assert(model.kind === "PER_UNIT", "serp meters delivery, 0|1");
    assertEquals(model.unit, "RESULT");
    assertEquals(model.every, 1);
    assertEquals(model.consumes, { credit: "default", amount: 0.0015 });
});

Deno.test("brightdata#serp: a 200 that delivered nothing is an upstream failure, and draws nothing", async () => {
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
        fixture: await loadFixture(`${chains}upstream-failure-empty.json`),
    });

    // design D4, the correction the envelope alone could not make: Bright
    // Data answered 200 (so `isProviderError` is false and the engine's
    // zero-bill rule never fires) but delivered no payload, with the real
    // 502 in a header no fn can read. The empty payload is the signal.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: { RESULT: 0 } });
    assertEquals(result.output, null);
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

Deno.test("brightdata#serp schema gate: a bad format is rejected before the wire, its near twin passes", async () => {
    const url = "https://www.google.com/search?q=pizza&brd_json=1";
    // `format` is a two-value vendor enum, and required
    await rejects({ url, format: "html" });
    await rejects({ url });
    // and the url itself must be non-empty
    await rejects({ url: "", format: "raw" });
    // the near twin passes the gate — proving it is not simply too wide
    assertEquals(await validates({ url, format: "json" }), {
        credits: { default: 0.0015 },
        evidence: { RESULT: 1 },
    });
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
        // shape, not amounts. Bright Data can answer 200 with an empty body
        // when the unlock fails upstream (design D4, drilled 2026-09-23), so
        // the live assertion pins the RULE rather than assuming delivery:
        // a payload arrived and drew the rate, or none did and drew nothing.
        if (result.output === null) {
            assertEquals(result.usage, {
                credits: {},
                evidence: { RESULT: 0 },
            });
        } else {
            assertEquals(result.usage.evidence, { RESULT: 1 });
            assertEquals(typeof result.usage.credits.default, "number");
            const output = result.output as Record<string, unknown>;
            assert(
                Array.isArray(output.organic),
                "a delivered SERP payload must parse to fields",
            );
        }
    },
});
