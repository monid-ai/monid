import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type Json, type RunInput } from "@shared/core";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

import { productInput, reviewInput } from "./testing.ts";

const fixtureDir = fromFileUrl(new URL("./fixtures/", import.meta.url));
const product = "pangolinfo#amazon/product";
const reviews = "pangolinfo#amazon/reviews";
const seller = "pangolinfo#amazon/seller";
const rufus = "pangolinfo#amazon/rufus";
const maps = "pangolinfo#maps/local";
async function replay(
    id: string,
    name: string,
    input: RunInput = productInput,
) {
    return await runEndpoint({
        unit: await testSealedUnit(id),
        input,
        mode: "replay",
        fixture: await loadFixture(`${fixtureDir}synthetic-${name}.json`),
    });
}

Deno.test("Pangolinfo: nonzero paid semantic outcomes retain code, message and charge", async () => {
    for (const code of [9201, 9204, 9206]) {
        const fixture = await loadFixture(
            `${fixtureDir}synthetic-success.json`,
        );
        fixture.calls[0].res.body = {
            code,
            message: "Billed semantic outcome",
            pointCost: 1,
            data: null,
        };
        const result = await runEndpoint({
            unit: await testSealedUnit(product),
            input: productInput,
            mode: "replay",
            fixture,
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage.credits, { default: 1 });
        assertEquals(result.output, fixture.calls[0].res.body);
    }
});

Deno.test("Pangolinfo: business failures and malformed 200 envelopes settle at zero", async () => {
    for (
        const [body, status] of [
            [{ code: 4029, pointCost: 0 }, 429],
            [{ code: 1002 }, 400],
            [{ code: 1004 }, 401],
            [{ code: 2001 }, 402],
            [{ code: 4003 }, 403],
            [{ code: 9205 }, 503],
            [{ code: 9200, pointCost: 0 }, 502],
            [{ unexpected: "payload" }, 502],
            [null, 502],
        ] as [Json, number][]
    ) {
        const fixture = await loadFixture(
            `${fixtureDir}synthetic-success.json`,
        );
        fixture.calls[0].res.body = body;
        const result = await runEndpoint({
            unit: await testSealedUnit(product),
            input: productInput,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
        assertEquals(result.output, body);
    }
});

Deno.test("Pangolinfo: transport errors remain errors even if their body claims a charge", async () => {
    const fixture = await loadFixture(`${fixtureDir}synthetic-success.json`);
    fixture.calls[0].res.status = 503;
    const result = await runEndpoint({
        unit: await testSealedUnit(product),
        input: productInput,
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 503);
    assertEquals(result.usage.credits, {});
});

Deno.test("Pangolinfo: actual fractional receipt wins and is preserved in output", async () => {
    const fixture = await loadFixture(`${fixtureDir}synthetic-success.json`);
    fixture.calls[0].res.body = {
        code: 0,
        pointCost: 0.75,
        data: { pointCost: 99 },
    };
    const result = await runEndpoint({
        unit: await testSealedUnit(product),
        input: productInput,
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage.credits, { default: 0.75 });
    assertEquals(result.output, fixture.calls[0].res.body);
});

Deno.test("Pangolinfo: explicit zero receipt cannot fall back to a nonzero derived charge", async () => {
    const result = await replay(product, "zero-cost");
    assertEquals(result.usage, { credits: {}, evidence: { PAGE: 0 } });
});

Deno.test("Pangolinfo reviews: caller caps three pages, partial delivery bills one", async () => {
    const unit = await testSealedUnit(reviews);
    assertEquals((await estimateEndpoint(unit, reviewInput)).credits, {
        default: 15,
    });
    const result = await replay(reviews, "review-partial", reviewInput);
    assertEquals(result.usage.credits, { default: 5 });
    assertEquals(result.usage.evidence, { PAGE: 1 });
});

Deno.test("Pangolinfo seller: actual receipt wins over requested page cap", async () => {
    const input = {
        body: { site: "amz_us", content: "ATVPDKIKX0DER", pageCount: 3 },
    };
    const unit = await testSealedUnit(seller);
    assertEquals((await estimateEndpoint(unit, input)).credits, { default: 3 });
    const result = await replay(seller, "success", input);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { PAGE: 3 },
        mismatch: { derived: { default: 3 } },
    });
});

Deno.test("Pangolinfo reviews: count successful pages despite short or empty review lists", async () => {
    for (const withReceipt of [false, true]) {
        const fixture = await loadFixture(
            `${fixtureDir}synthetic-review-partial.json`,
        );
        fixture.calls[0].res.body = {
            code: 0,
            ...(withReceipt ? { pointCost: 10 } : {}),
            data: {
                json: [
                    {
                        code: 0,
                        data: {
                            results: [{ reviewId: "A" }, { reviewId: "B" }, {
                                reviewId: "C",
                            }],
                        },
                    },
                    { code: 0, data: { results: [] } },
                    { code: 9200, data: { results: [] } },
                    { code: 0, data: null },
                ],
            },
        };
        const result = await runEndpoint({
            unit: await testSealedUnit(reviews),
            input: reviewInput,
            mode: "replay",
            fixture,
        });
        assertEquals(result.usage, {
            credits: { default: 10 },
            evidence: { PAGE: 2 },
        });
    }
});

Deno.test("Pangolinfo reviews: delivered page evidence respects the cap and zero receipt", async () => {
    const fixture = await loadFixture(
        `${fixtureDir}synthetic-review-partial.json`,
    );
    for (const pointCost of [undefined, 0]) {
        fixture.calls[0].res.body = {
            code: 0,
            ...(pointCost === undefined ? {} : { pointCost }),
            data: {
                json: Array.from(
                    { length: 4 },
                    () => ({ code: 0, data: { results: [] } }),
                ),
            },
        };
        const result = await runEndpoint({
            unit: await testSealedUnit(reviews),
            input: reviewInput,
            mode: "replay",
            fixture,
        });
        assertEquals(
            result.usage,
            pointCost === 0
                ? { credits: {}, evidence: { PAGE: 0 } }
                : { credits: { default: 15 }, evidence: { PAGE: 3 } },
        );
    }
});

Deno.test("Pangolinfo seller: discounted receipts cannot reveal delivered pages", async () => {
    const fixture = await loadFixture(`${fixtureDir}synthetic-success.json`);
    fixture.calls[0].res.body = {
        code: 0,
        pointCost: 0.75,
        data: { json: [{ code: 0, data: { results: [] } }] },
    };
    const result = await runEndpoint({
        unit: await testSealedUnit(seller),
        input: {
            body: { site: "amz_us", content: "ATVPDKIKX0DER", pageCount: 3 },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage, {
        credits: { default: 0.75 },
        evidence: { PAGE: 3 },
        mismatch: { derived: { default: 3 } },
    });
});

Deno.test("Pangolinfo Rufus: only answered turns bill when no pointCost is reported", async () => {
    const input = {
        body: { param: ["Shopping question", "Refused question"] },
    };
    const unit = await testSealedUnit(rufus);
    assertEquals((await estimateEndpoint(unit, input)).credits, {
        default: 12,
    });
    const result = await replay(rufus, "alexa-partial", input);
    assertEquals(result.usage, {
        credits: { default: 6 },
        evidence: { RESULT: 1 },
    });
    const refusal = await replay(rufus, "alexa-refused", input);
    assertEquals(refusal.httpStatus, 422);
    assertEquals(refusal.usage.credits, {});
});

Deno.test("Pangolinfo Rufus: legacy no-status turns follow backend answer detection", async () => {
    const fixture = await loadFixture(
        `${fixtureDir}synthetic-alexa-partial.json`,
    );
    fixture.calls[0].res.body = {
        code: 0,
        data: {
            json: [
                { content: "  " },
                { products: [{ asin: "B0B4NLGCH5" }] },
                { follow_up_questions: ["Next?"] },
                { status: "refused", content: "Do not bill" },
            ],
        },
    };
    const result = await runEndpoint({
        unit: await testSealedUnit(rufus),
        input: { body: { param: ["One", "Two", "Three", "Four"] } },
        mode: "replay",
        fixture,
    });
    assertEquals(result.usage.credits, { default: 12 });
});

Deno.test("Pangolinfo Maps: native rate is 1.5 points per search", async () => {
    const unit = await testSealedUnit(maps);
    assertEquals(
        (await estimateEndpoint(unit, {
            body: { q: "coffee", ll: "37,-122,13z", num: 10 },
        })).credits,
        { default: 1.5 },
    );
});

Deno.test("Pangolinfo: reject invalid scope, parser override and callback before network", async () => {
    const bad: [string, RunInput][] = [
        [product, {
            body: { ...productInput.body, parserName: "amzReviewV2" },
        }],
        [product, { body: { ...productInput.body, format: "rawHtml" } }],
        [product, {
            body: {
                ...productInput.body,
                bizContext: { callbackUrl: "https://example.com" },
            },
        }],
        [product, { body: { ...productInput.body, site: "unknown" } }],
        [product, { body: { ...productInput.body, content: "bad-asin" } }],
        [product, {
            body: { ...productInput.body, bizContext: { zipcode: "90210" } },
        }],
        ["pangolinfo#amazon/category", {
            body: { site: "amz_us", content: "172282?page=2" },
        }],
        [seller, {
            body: {
                site: "amz_us",
                content: "ATVPDKIKX0DER?page=2",
                pageCount: 1,
            },
        }],
        [reviews, {
            body: {
                url: "https://www.amazon.com",
                bizContext: { asin: "B0B4NLGCH5" },
            },
        }],
        [reviews, {
            body: {
                ...reviewInput.body,
                bizContext: { asin: "B0B4NLGCH5", pageCount: 11 },
            },
        }],
        [seller, { body: { site: "amz_us", content: "ATVPDKIKX0DER" } }],
        [maps, { body: { q: "coffee", ll: "37,-122,13z" } }],
        [maps, { body: { q: "coffee", ll: "invalid", num: 10 } }],
        [rufus, { body: { param: [] } }],
        ["pangolinfo#amazon/search", {
            body: { url: "https://www.amazon.com.evil.test/s?k=coffee" },
        }],
        ...[
            "https://www.amazon.com/dp/B0B4NLGCH5?next=/s?k=earbuds",
            "https://www.amazon.com/dp/B0B4NLGCH5#/s?k=earbuds",
            "https://www.amazon.com/s?k=",
            "https://www.amazon.com/s?page=2",
            "https://www.amazon.com/gp/s?k=earbuds",
        ].map((
            url,
        ): [string, RunInput] => ["pangolinfo#amazon/search", {
            body: { url },
        }]),
    ];
    for (const [id, input] of bad) {
        const unit = await testSealedUnit(id);
        await assertRejects(
            () => runEndpoint({ unit, input, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});

Deno.test({
    name: "Pangolinfo product live (gated on PANGOLINFO_CREDENTIALS_API_KEY)",
    ignore: liveSkip("pangolinfo"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(product),
            input: productInput,
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assert((result.usage.credits.default ?? 0) > 0);
    },
});
