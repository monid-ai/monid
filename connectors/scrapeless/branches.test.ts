import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import {
    estimateEndpoint,
    type Fixture,
    loadFixture,
    testSealedUnit,
} from "@shared/testing";
import { runStrictReplay as strict } from "./strict-replay.ts";

const cases = [
    ["amazon/rufus", "rufus-base", 0.003],
    ["amazon/rufus", "rufus-questions", 0.003],
    ["amazon/rufus", "rufus-sse", 0.003],
    ["amazon/rufus", "rufus-no-asin", 0.003],
    ["amazon/rufus", "rufus-asin", 0.003],
    ["tiktok/user/work", "tiktok-page", 0.003],
    ["ai/gemini", "gemini-buy-us", 0.0018],
    ["ai/gemini", "gemini-buy-gb", 0.0018],
    ["ai/aimode", "aimode-share", 0.0018],
    ["ai/aimode", "aimode-resolved-share-url", 0.0018],
] as const;

async function fixture(name: string): Promise<Fixture> {
    return await loadFixture(
        new URL(
            "./fixtures/recorded-branches-" + name + ".json",
            import.meta.url,
        ).pathname,
    );
}
for (const [id, name, price] of cases) {
    Deno.test(
        "branches " + name +
            ": exact native wire, retained payload and declared settlement",
        async () => {
            const f = await fixture(name);
            const result = await strict(id, f);
            assertEquals(result.isProviderError, false);
            assertEquals(result.usage.credits, { default: price });
            assertEquals(result.httpStatus, 200);
            const out = result.output as Record<string, Json>;
            assertEquals(
                out.provider_response,
                f.calls.at(-1)!.res.body,
            );
        },
    );
}
Deno.test("branches Rufus: is_get_question adds per-product questions, not a top-level suppression switch", async () => {
    const off = await fixture("rufus-base"),
        on = await fixture("rufus-questions");
    const a = (off.calls[0].req.body as { input: Record<string, Json> }).input;
    const b = (on.calls[0].req.body as { input: Record<string, Json> }).input;
    assertEquals({ ...a, is_get_question: true }, b);
    for (const [f, enabled] of [[off, false], [on, true]] as const) {
        const out = (await strict("amazon/rufus", f)).output as {
            provider_response: {
                result: {
                    products: Record<string, Json>[];
                    related_questions: Json[];
                };
            };
        };
        assert(out.provider_response.result.related_questions.length > 0);
        assert(out.provider_response.result.products.length > 0);
        assertEquals(
            out.provider_response.result.products.every((p) =>
                Array.isArray(p.related_questions)
            ),
            enabled,
        );
    }
});
Deno.test("branches Rufus: is_sse_data is buffered JSON html, not an advertised event-stream", async () => {
    const off = await fixture("rufus-base"), on = await fixture("rufus-sse");
    const a = (off.calls[0].req.body as { input: Record<string, Json> }).input;
    const b = (on.calls[0].req.body as { input: Record<string, Json> }).input;
    assertEquals({ ...a, is_sse_data: true }, b);
    const offRaw =
        ((await strict("amazon/rufus", off)).output as Record<string, Json>)
            .provider_response as Record<string, Json>;
    const onRaw =
        ((await strict("amazon/rufus", on)).output as Record<string, Json>)
            .provider_response as Record<string, Json>;
    assertEquals(offRaw.html, undefined);
    assert(
        typeof onRaw.html === "string" && onRaw.html.includes("event:") &&
            onRaw.html.includes("data:"),
    );
    assert(onRaw.result !== null && typeof onRaw.result === "object");
});
Deno.test("branches Rufus: same question with ASIN has product-aware answer, without ASIN asks for context", async () => {
    const absent = await fixture("rufus-no-asin"),
        present = await fixture("rufus-asin");
    const a =
        (absent.calls[0].req.body as { input: Record<string, Json> }).input;
    const b =
        (present.calls[0].req.body as { input: Record<string, Json> }).input;
    assertEquals({ ...a, asin: "B0GN4CFF6H" }, b);
    const answer = async (f: Fixture) =>
        ((await strict("amazon/rufus", f)).output as {
            provider_response: { result: { inference_text: string } };
        }).provider_response.result.inference_text;
    assert((await answer(absent)).includes("Could you clarify"));
    assert((await answer(present)).includes("Sony WH-1000XM6"));
});
Deno.test("branches TikTok: native two-post sample without continuation is not complete-history proof", async () => {
    const f = await fixture("tiktok-page");
    const result = await strict("tiktok/user/work", f);
    const raw = (result.output as { provider_response: { items: Json[] } })
        .provider_response;
    assertEquals(raw.items.length, 2);
    assertEquals(Object.keys(raw), ["items"]);
    assertEquals(
        (f.calls[0].req.body as { input: { cursor: string; count: number } })
            .input.cursor,
        "0",
    );
    assertEquals(
        (f.calls[0].req.body as { input: { count: number } }).input.count,
        2,
    );
});
for (const returnsCursor of [false, true]) {
    Deno.test(
        "branches TikTok: synthetic opaque cursor passes unchanged; auto-pagination=" +
            false + ", returned-cursor=" + returnsCursor,
        async () => {
            const f = await fixture("tiktok-page");
            f.name = "synthetic-branches-cursor";
            f.description =
                "Synthetic cursor preservation, not native continuation evidence.";
            const body = f.calls[0].req.body as { input: Record<string, Json> };
            body.input.cursor = "OPAQUE_SUPPLIER_TOKEN";
            f.calls[0].res.body = {
                items: [],
                ...(returnsCursor
                    ? { next_cursor: "NEXT_OPAQUE_TOKEN", has_more: true }
                    : {}),
            };
            const result = await strict("tiktok/user/work", f);
            assertEquals(
                (result.output as Record<string, Json>).provider_response,
                f.calls[0].res.body,
            );
        },
    );
}
Deno.test("branches Gemini: synthetic products and merchant fields survive, enriched charge once", async () => {
    const f = await fixture("gemini-buy-us");
    f.name = "synthetic-branches-gemini-products";
    f.description =
        "Synthetic positive products, never a native positive or debit receipt.";
    const final = f.calls.at(-1)!.res.body as {
        task_result: Record<string, Json>;
    };
    final.task_result.products = [{
        title: "SYNTHETIC_PRODUCT",
        stores: [{
            name: "SYNTHETIC_MERCHANT",
            link: "https://example.com/product",
            price: "USD 10",
            extensions: ["stock"],
            total_price: "USD 10",
        }],
        about_the_product: { features: [{ title: "color", value: "blue" }] },
        variants: [{
            title: "color",
            items: [{ name: "blue", selected: true, availability: true }],
        }],
    }];
    const result = await strict("ai/gemini", f);
    assertEquals(result.usage.credits, { default: 0.0036 });
    assertEquals(
        (result.output as Record<string, Json>).provider_response,
        f.calls.at(-1)!.res.body,
    );
    assertEquals(
        (await estimateEndpoint(await testSealedUnit("scrapeless#ai/gemini"), {
            body: f.calls[0].req.body!,
        })).credits,
        { default: 0.0036 },
    );
});
Deno.test("branches AI Mode: URL request is the fresh native share link, with no substitute prompt", async () => {
    const origin = await fixture("aimode-share");
    const reread = await fixture("aimode-current-share-url");
    const raw = origin.calls.at(-1)!.res.body as {
        task_result: { share_url: string };
    };
    const input =
        (reread.calls[0].req.body as { input: Record<string, Json> }).input;
    assertEquals(input, { url: raw.task_result.share_url });
    // Historical direct-short-URL wire is retained; current binding resolves
    // the observed Google redirects before its sole supplier submission.
    assertEquals(reread.calls.at(-1)!.res.status, 400);
    assertEquals(reread.calls.filter((c) => c.req.method === "POST").length, 1);
});
for (
    const url of [
        "https://www.google.com/search?udm=50&q=test",
        "https://share.google/OPAQUE",
        "https://www.google.com/async/folwr?id=OPAQUE",
    ]
) {
    Deno.test(
        "branches AI Mode schema: no undocumented restriction by URL form " +
            url,
        async () => {
            const unit = await testSealedUnit("scrapeless#ai/aimode");
            const estimate = await estimateEndpoint(unit, {
                body: { input: { url } },
            });
            assertEquals(estimate.credits, { default: 0.0036 });
            await assertRejects(() =>
                estimateEndpoint(unit, {
                    body: { input: { url, prompt: "test", country: "US" } },
                })
            );
        },
    );
}
for (const field of ["is_sse_data", "is_get_question"]) {
    Deno.test(
        "branches Rufus: " + field + " is a boolean, not a string",
        async () => {
            const unit = await testSealedUnit("scrapeless#amazon/rufus");
            await assertRejects(() =>
                estimateEndpoint(
                    unit,
                    {
                        body: {
                            input: {
                                type: "rufus",
                                keywords: "headphones",
                                domain: "www.amazon.com",
                                [field]: "true",
                            },
                        },
                    },
                )
            );
        },
    );
}
