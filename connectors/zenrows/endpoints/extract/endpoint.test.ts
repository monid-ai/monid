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

const EXTRACT = "zenrows#extract";
const fixture = (name: string) =>
    fromFileUrl(new URL(`../../fixtures/${name}.json`, import.meta.url));
const PRODUCT =
    "https://www.scrapingcourse.com/ecommerce/product/abominable-hoodie/";

Deno.test("zenrows#extract happy: the parsed fields without the page", async () => {
    const loaded = await loadFixture(fixture("extract-product"));
    const parsed = structuredClone(
        (loaded.calls[0].res.body as Record<string, Json>).parsed,
    ) as Record<string, unknown>;
    const result = await runEndpoint({
        unit: await testSealedUnit(EXTRACT),
        input: { queryParams: { url: PRODUCT } },
        mode: "replay",
        fixture: loaded,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);

    const output = result.output as Record<string, unknown>;
    // fromResponse returns `parsed` and drops `html`. The real capture
    // carried 166604 characters of html beside 2879 bytes of parsed, so
    // this is the difference between a usable answer and the whole page.
    assertEquals("html" in output, false);
    // Every row, not just the key set: breadcrumbs, gallery_images and
    // related_products could each arrive empty and a key check would still
    // pass. This also pins that a field Extract parsed as empty survives as
    // null rather than being dropped, so a caller can tell "absent" from
    // "not on the page".
    assertEquals(output, parsed);

    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
});

Deno.test("zenrows#extract a body with no parsed passes through whole", async () => {
    // A vendor shape change must not silently empty the output.
    const unit = await testSealedUnit(EXTRACT);
    const loaded = await loadFixture(fixture("extract-product"));
    loaded.calls[0].res.body = { html: "<html></html>", other: { a: 1 } };
    const result = await runEndpoint({
        unit,
        input: { queryParams: { url: PRODUCT } },
        mode: "replay",
        fixture: loaded,
    });
    assertEquals(result.output, { html: "<html></html>", other: { a: 1 } });
});

Deno.test("zenrows#extract provider error: an unprepared domain, digested and unbilled", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(EXTRACT),
        input: { queryParams: { url: "https://example.com/" } },
        mode: "replay",
        fixture: await loadFixture(fixture("extract-domain-not-prepared")),
    });
    assertEquals(result.httpStatus, 403);
    assertEquals(result.isProviderError, true);
    assertEquals((result.output as Record<string, unknown>).code, "REQS007");
    // The raw envelope rides along, so a caller can read `reason` and tell
    // domain_not_prepared from page_not_recognised without parsing English.
    const raw = (result.output as Record<string, unknown>).raw as Record<
        string,
        unknown
    >;
    assertEquals(raw.reason, "domain_not_prepared");
    // The whole usage, not just credits: evidence must be empty too, or a
    // refused run could still carry a 25-credit hold out with it.
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("zenrows#extract a charged 404 settles at its meter, not as a failure", async () => {
    // Extract inherits the rule from the provider's lifecycle.start: Zenrows
    // counts a 404 from the target as a request it carried out and charges for
    // it, so a positive meter settles the run and the target's status rides on
    // providerHttpStatus. Scrape has the same test; this one proves the second
    // endpoint is covered by the same fn rather than by luck.
    const result = await runEndpoint({
        unit: await testSealedUnit(EXTRACT),
        input: { queryParams: { url: PRODUCT } },
        mode: "replay",
        fixture: await loadFixture(fixture("extract-page-gone")),
    });
    assertEquals(result.isProviderError, false);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.providerHttpStatus, 404);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    // No `parsed` to unwrap, so the envelope passes through whole.
    assertEquals((result.output as Record<string, unknown>).code, "RESP002");
});

Deno.test("zenrows#extract input: the vendor's own parameters, strictly", async () => {
    const unit = await testSealedUnit(EXTRACT);
    for (
        const queryParams of [
            {},
            { url: "not-a-url" },
            { url: PRODUCT, nope: 1 },
            // `extract` is pinned at the binding, not a caller's to choose
            { url: PRODUCT, extract: "standard" },
            // these shape a scrape's output and have no meaning here
            { url: PRODUCT, response_type: "markdown" },
            { url: PRODUCT, css_extractor: '{"a":"b"}' },
            { url: PRODUCT, outputs: "emails" },
        ]
    ) {
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
    const accepted: Record<string, Json>[] = [
        { url: PRODUCT },
        { url: PRODUCT, extract_fields: "product.name,product.price" },
        { url: PRODUCT, mode: "auto" },
        { url: PRODUCT, js_render: true, premium_proxy: true },
    ];
    for (const queryParams of accepted) {
        await assertInputAccepted({
            unit,
            input: { queryParams },
            mode: "replay",
            fixture: await loadFixture(fixture("extract-product")),
        });
    }
});

Deno.test({
    name: "zenrows#extract live: a prepared domain, really billed",
    ignore: liveSkip("zenrows"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(EXTRACT),
            input: { queryParams: { url: PRODUCT } },
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        const output = result.output as Record<string, unknown>;
        assertEquals("html" in output, false);
        assertEquals("product" in output, true);
    },
});
