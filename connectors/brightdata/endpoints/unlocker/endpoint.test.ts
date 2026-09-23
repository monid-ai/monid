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

Deno.test("brightdata#unlocker happy: a markdown payload is a STRING, and rides through as one", async () => {
    const unit = await testSealedUnit("brightdata#unlocker");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://example.com",
                format: "raw",
                data_format: "markdown",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}unlocker-markdown-ok.json`),
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.0015 },
        evidence: { CALL: 1 },
    });
    // the engine's sniffing decode: a body that is not JSON is the complete
    // raw body as a faithful string. No connector-side parsing is authored,
    // because none is needed.
    assertEquals(typeof result.output, "string");
    assert((result.output as string).startsWith("Example Domain"));
});

Deno.test("brightdata#unlocker: a target 404 is billable success, not a provider error", async () => {
    const unit = await testSealedUnit("brightdata#unlocker");
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                url: "https://example.com/nonexistent-page-xyz-123",
                format: "json",
            },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}unlocker-target-404.json`),
    });

    // design D4: the ENVELOPE says whether Bright Data billed, and the
    // envelope is 200 — the unlock happened. The target's own status is a
    // field inside it, never the envelope's status.
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.0015 },
        evidence: { CALL: 1 },
    });
    assertEquals(
        (result.output as Record<string, unknown>).status_code,
        404,
    );
});

Deno.test("brightdata#unlocker: a wrong zone is a plain-text 400, zero usage", async () => {
    const unit = await testSealedUnit("brightdata#unlocker");
    const result = await runEndpoint({
        unit,
        input: { body: { url: "https://example.com", format: "raw" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}zone-not-found.json`),
    });

    assertEquals(result.httpStatus, 400);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    assertEquals(result.output, 'zone "no_such_zone_xyz" not found');
});

Deno.test("brightdata: the twins share one wire path and are told apart by declared id", async () => {
    const serp = await testSealedUnit("brightdata#serp");
    const unlocker = await testSealedUnit("brightdata#unlocker");
    // same POST /request on both — the id is DECLARED precisely because the
    // native path would collide them (AGENT.md; the contactout posture)
    assertEquals(serp.doc.request.url, "https://api.brightdata.com/request");
    assertEquals(
        unlocker.doc.request.url,
        "https://api.brightdata.com/request",
    );
    assertEquals(serp.doc.request.method, "POST");
    assertEquals(unlocker.doc.request.method, "POST");
    assert(serp.doc.id !== unlocker.doc.id);
    // `render` and `debug` are Web Unlocker's alone — the SERP mirror does
    // not carry them (design D2)
    const unlockerProps = unlocker.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    const serpProps = serp.doc.input.schema.body?.properties as Record<
        string,
        unknown
    >;
    assert("render" in unlockerProps && "debug" in unlockerProps);
    assert(!("render" in serpProps) && !("debug" in serpProps));
});

Deno.test({
    name:
        "brightdata#unlocker live (gated on BRIGHTDATA_CREDENTIALS_{API_KEY,SERP_ZONE,UNLOCKER_ZONE})",
    ignore: liveSkip("brightdata", BRIGHTDATA_KEYS),
    fn: async () => {
        const unit = await testSealedUnit("brightdata#unlocker");
        const result = await runEndpoint({
            unit,
            input: {
                body: {
                    url: "https://example.com",
                    format: "raw",
                    data_format: "markdown",
                },
            },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output).slice(0, 400),
        );
        assertEquals(result.usage, {
            credits: { default: 0.0015 },
            evidence: { CALL: 1 },
        });
        assertEquals(typeof result.output, "string");
    },
});
