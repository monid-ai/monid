import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

// Public native rate card, verified 2026-10-29. Kept independent of endpoint defs.
const rates = {
    standard: {
        amount: 1,
        source: "https://docs.pangolinfo.com/en-api-reference/amazonApi/submit",
    },
    reviews: {
        amount: 5,
        source:
            "https://docs.pangolinfo.com/en-api-reference/amazonReviewAPI/amazonReviewAPI",
    },
    rufus: {
        amount: 6,
        source:
            "https://docs.pangolinfo.com/en-api-reference/amazonAlexaAPI/amazonAlexaAPI",
    },
    maps: {
        amount: 1.5,
        source:
            "https://docs.pangolinfo.com/en-api-reference/mapDataApi/mapDataAPI",
    },
};

const fixtureDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const product = "pangolinfo#amazon/product";
const reviews = "pangolinfo#amazon/reviews";
const seller = "pangolinfo#amazon/seller";
const rufus = "pangolinfo#amazon/rufus";
const maps = "pangolinfo#maps/local";
export const productInput = { body: { site: "amz_us", content: "B0B4NLGCH5" } };
export const reviewInput = {
    body: {
        url: "https://www.amazon.com",
        bizContext: { asin: "B0B4NLGCH5", pageCount: 3 },
    },
};

// Verify actual wire bodies AND auth through the compiled lifecycle. The shared
// replay harness checks URL/method; this test additionally checks every field.
const standard = { format: "json", timeout: 60000 };
const cases = [
    {
        id: product,
        body: productInput.body,
        wire: {
            ...productInput.body,
            ...standard,
            parserName: "amzProductDetail",
        },
        path: "/api/v1/scrape",
    },
    {
        id: "pangolinfo#amazon/search",
        body: {
            url: "https://www.amazon.de/s?k=coffee&page=2",
            bizContext: { zipcode: "10115" },
        },
        wire: {
            url: "https://www.amazon.de/s?k=coffee&page=2",
            bizContext: { zipcode: "10115" },
            ...standard,
            parserName: "amzKeyword",
        },
        path: "/api/v1/scrape",
    },
    ...[
        ["bestsellers", "amzBestSellers", "electronics"],
        ["new-releases", "amzNewReleases", "electronics"],
        ["category", "amzProductOfCategory", "172282"],
    ].map(([id, parserName, content]) => ({
        id: `pangolinfo#amazon/${id}`,
        body: { site: "amz_jp", content },
        wire: { site: "amz_jp", content, ...standard, parserName },
        path: "/api/v1/scrape",
    })),
    {
        id: seller,
        body: {
            site: "amz_us",
            content: "ATVPDKIKX0DER",
            pageCount: 3,
            categoryId: "172282",
        },
        wire: {
            site: "amz_us",
            content: "ATVPDKIKX0DER",
            pageCount: 3,
            categoryId: "172282",
            ...standard,
            parserName: "amzProductOfSeller",
        },
        path: "/api/v1/scrape",
    },
    {
        id: "pangolinfo#amazon/offers",
        body: productInput.body,
        wire: { ...productInput.body, timeout: 90000 },
        path: "/api/v1/scrape/follow-seller",
    },
    {
        id: reviews,
        body: { ...reviewInput.body, site: "amz_us" },
        wire: {
            site: "amz_us",
            url: "https://www.amazon.com",
            bizContext: {
                ...reviewInput.body.bizContext,
                bizKey: "review",
                filterByStar: "all_stars",
                sortBy: "recent",
            },
            format: "json",
            formatType: "all_formats",
            parserName: "amzReviewV2",
            mediaType: "all_contents",
        },
        path: "/api/v1/scrape",
    },
    {
        id: rufus,
        body: { param: ["A travel book?"], site: "jp" },
        wire: {
            param: ["A travel book?"],
            site: "jp",
            parserName: "amazonAlexa",
            screenshot: false,
            timeout: 240000,
        },
        path: "/api/v2/scrape",
    },
    {
        id: maps,
        body: { q: "coffee", ll: "37.7822,-122.4642,13z", num: 10 },
        wire: {
            q: "coffee",
            ll: "37.7822,-122.4642,13z",
            num: 10,
            hl: "en",
            start: 0,
            timeout: 25000,
        },
        path: "/api/v3/extract/search/maps/local",
    },
];

export function testEndpoint(id: string) {
    const entry = cases.find((candidate) => candidate.id === id);
    if (!entry) throw new Error(`Missing Pangolinfo test case: ${id}`);
    Deno.test(`${entry.id}: exact wire request, bearer auth and one call`, async () => {
        const unit = await testSealedUnit(entry.id);
        let calls = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "test-key" }),
                fetch: (input, init) => {
                    calls++;
                    assertEquals(
                        String(input),
                        `https://scrapeapi.pangolinfo.com${entry.path}`,
                    );
                    assertEquals(init?.method, "POST");
                    assertEquals(
                        new Headers(init?.headers).get("authorization"),
                        "Bearer test-key",
                    );
                    assertEquals(JSON.parse(String(init?.body)), entry.wire);
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                code: 0,
                                pointCost: 0,
                                data: { json: [] },
                            }),
                            {
                                status: 200,
                                headers: { "content-type": "application/json" },
                            },
                        ),
                    );
                },
            }),
        });
        const runnable = await engine.load(unit);
        const result = await runnable.run({ body: entry.body as Json });
        assertEquals(calls, 1);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, {
            credits: {},
            evidence: entry.id === rufus ? { RESULT: 0 } : { PAGE: 0 },
        });
    });

    const name = entry.id === "pangolinfo#amazon/offers"
        ? "paid-empty"
        : entry.id === reviews
        ? "review-success"
        : entry.id === rufus
        ? "rufus-success"
        : entry.id === maps
        ? "maps-success"
        : "page-success";
    const rate = rates[
        entry.id === reviews
            ? "reviews"
            : entry.id === rufus
            ? "rufus"
            : entry.id === maps
            ? "maps"
            : "standard"
    ];
    const evidence: Record<string, number> = entry.id === rufus
        ? { RESULT: 1 }
        : entry.id === seller
        ? { PAGE: 3 }
        : { PAGE: 1 };
    Deno.test(`${entry.id}: replay recorded provider shape (${name})`, async () => {
        const unit = await testSealedUnit(entry.id);
        const estimateUnits = entry.id === reviews || entry.id === seller
            ? 3
            : 1;
        assertEquals(
            await estimateEndpoint(unit, { body: entry.body as Json }),
            {
                credits: { default: rate.amount * estimateUnits },
                evidence: entry.id === rufus
                    ? { RESULT: 1 }
                    : { PAGE: estimateUnits },
            },
        );
        const fixture = await loadFixture(`${fixtureDir}${name}.json`);
        const result = await runEndpoint({
            unit,
            input: { body: entry.body as Json },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, {
            credits: { default: rate.amount },
            evidence,
            ...(entry.id === seller
                ? { mismatch: { derived: { default: 3 } } }
                : {}),
        });
        assertEquals(result.output, fixture.calls[0].res.body);
    });
}
