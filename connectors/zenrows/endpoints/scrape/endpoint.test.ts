import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const SCRAPE = "zenrows#scrape";
const fixture = (name: string) =>
    fromFileUrl(new URL(`../../fixtures/${name}.json`, import.meta.url));
const URL_ = "https://example.com/";

Deno.test("zenrows#scrape happy: the markdown page, one credit, no mismatch", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(SCRAPE),
        input: { queryParams: { url: URL_ } },
        mode: "replay",
        fixture: await loadFixture(fixture("scrape-markdown")),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    // The body rides out as the vendor sent it: a string is valid Json, so
    // Markdown needs no output hook.
    assertEquals(
        result.output,
        "This domain is for use in documentation examples without needing permission. This is not a service; avoid relying on it for testing and monitoring purposes.",
    );
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
});

Deno.test("zenrows#scrape html: the vendor is sent no response_type at all", async () => {
    // `html` is this endpoint's own value. The API has no such value and
    // answers 400 for it, so toRequest drops the parameter entirely. The
    // fixture's recorded URL carries no response_type, so a replay only
    // matches if the translation happened.
    const result = await runEndpoint({
        unit: await testSealedUnit(SCRAPE),
        input: { queryParams: { url: URL_, response_type: "html" } },
        mode: "replay",
        fixture: await loadFixture(fixture("scrape-html")),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(typeof result.output, "string");
    assertEquals(result.usage.credits, { default: 1 });
});

Deno.test("zenrows#scrape provider error: digested, and a meter cannot bill it", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(SCRAPE),
        input: { queryParams: { url: URL_ } },
        mode: "replay",
        fixture: await loadFixture(fixture("scrape-unauthorized")),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    // fromError reads `detail` first, `title` as the fallback, and carries
    // the vendor's code; the raw envelope rides under `raw`.
    assertEquals(
        (result.output as Record<string, unknown>).message,
        "Invalid API key.",
    );
    assertEquals((result.output as Record<string, unknown>).code, "AUTH002");
    // The engine forces zero usage on a provider error: a fn cannot bill it.
    assertEquals(result.usage.credits, {});
});

Deno.test("zenrows#scrape input: the vendor's own parameters, strictly", async () => {
    const unit = await testSealedUnit(SCRAPE);
    const rejects = [
        {},
        { url: "" },
        { url: "ftp://example.com/" },
        { url: URL_, nope: 1 },
        { url: URL_, mode: "stealth" },
        { url: URL_, response_type: "pdf" },
        { url: URL_, session_id: "abc" },
        { url: URL_, js_render: "true" },
    ];
    for (const queryParams of rejects) {
        await assertRejects(
            () =>
                runEndpoint({
                    unit,
                    input: { queryParams } as never,
                    mode: "replay",
                }),
            Error,
            "INVALID_INPUT",
            `${JSON.stringify(queryParams)} must not reach the wire`,
        );
    }
    // The complement: a gate that rejects everything would pass the above.
    const accepted: Record<string, Json>[] = [
        { url: URL_ },
        { url: URL_, mode: "auto" },
        { url: URL_, response_type: "plaintext" },
        { url: URL_, css_extractor: '{"title":"h1"}' },
        { url: URL_, outputs: "emails,links", response_type: "html" },
        { url: URL_, js_render: true, premium_proxy: true },
        { url: URL_, session_id: 7, allowed_status_codes: "404,500" },
    ];
    for (const queryParams of accepted) {
        await assertInputAccepted({
            unit,
            input: { queryParams },
            mode: "replay",
            fixture: await loadFixture(fixture("scrape-markdown")),
        });
    }
});

Deno.test({
    name: "zenrows#scrape live: a real page, really billed",
    ignore: liveSkip("zenrows"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(SCRAPE),
            input: { queryParams: { url: URL_ } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(typeof result.output, "string");
        // A plain request draws exactly one credit, and the claim comes
        // from the header rather than the rate card.
        assertEquals(result.usage.credits, { default: 1 });
    },
});
