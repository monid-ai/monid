import { assert, assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { fromFileUrl } from "@std/path";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import {
    DATA_SOURCE_DESCRIPTION,
    SOURCES_DESCRIPTION,
    WEB_SOURCE_DESCRIPTION,
} from "./schema/inputs.ts";

const ID = "tako#v3/search";
const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));

async function run(fixture: string, body: Json) {
    return await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });
}

Deno.test("tako#v3/search settles at Tako's reported cost and strips usage from the output", async () => {
    const result = await run("synthetic-search-traffic-card.json", {
        query: "stripe.com monthly visits",
    });

    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.135 },
        evidence: { call: 1, metered: 12_800 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals("usage" in output, false);
    assertEquals((output.cards as unknown[]).length, 1);
});

Deno.test("tako#v3/search bills the deep premium on the metered line", async () => {
    const result = await run("synthetic-search-deep.json", {
        query: "US unemployment rate",
        effort: "deep",
    });

    assertEquals(result.usage, {
        credits: { default: 0.012 },
        evidence: { call: 1, metered: 500 },
    });
});

Deno.test("tako#v3/search estimate holds the default variable-cost cap", async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: { query: "stripe.com monthly visits" },
    });

    assertEquals(usage.evidence, { call: 1, metered: 25_000 });
    assertEquals(usage.credits.default, 0.007 + 25_000 * 0.00001);
});

Deno.test("tako#v3/search estimate adds the deep premium, inlined rows, and a caller's cap", async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: {
            query: "US unemployment rate",
            effort: "deep",
            sources: {
                data: {
                    include_contents: true,
                    max_rows: 50,
                    max_variable_cost_usd: 1,
                },
            },
        },
    });

    assertEquals(usage.evidence, {
        call: 1,
        metered: 500 + 100_000 + 5 * 100 + 5 * 50 * 160,
    });
});

Deno.test("tako#v3/search estimate fills a caller's data source with the binding defaults", async () => {
    const usage = await estimateEndpoint(await testSealedUnit(ID), {
        body: {
            query: "stripe.com monthly visits",
            sources: { data: { include_contents: true } },
        },
    });

    assertEquals(usage.evidence, {
        call: 1,
        metered: 25_000 + 5 * 100 + 5 * 20 * 160,
    });
});

Deno.test("tako#v3/search estimate caps inlined rows at the response budget", async () => {
    const unit = await testSealedUnit(ID);
    const fiveCards = await estimateEndpoint(unit, {
        body: {
            query: "US unemployment rate",
            sources: {
                data: {
                    include_contents: true,
                    max_rows: 100_000,
                    max_variable_cost_usd: 0,
                },
            },
        },
    });
    const twentyCards = await estimateEndpoint(unit, {
        body: {
            query: "US unemployment rate",
            sources: {
                data: {
                    count: 20,
                    include_contents: true,
                    max_rows: 100_000,
                    max_variable_cost_usd: 0,
                },
            },
        },
    });

    assertEquals(fiveCards.evidence, {
        call: 1,
        metered: 5 * 100 + (2_000 + 5 * 20) * 160,
    });
    assertEquals(twentyCards.evidence, {
        call: 1,
        metered: 20 * 100 + (2_000 + 20 * 20) * 160,
    });
});

Deno.test("tako#v3/search estimate holds only the base price for a web-only search or a zero cap", async () => {
    const unit = await testSealedUnit(ID);
    const webOnly = await estimateEndpoint(unit, {
        body: { query: "stripe news", sources: { web: {} } },
    });
    const zeroCap = await estimateEndpoint(unit, {
        body: {
            query: "stripe.com monthly visits",
            sources: { data: { max_variable_cost_usd: 0 } },
        },
    });

    assertEquals(webOnly.evidence, { call: 1 });
    assertEquals(zeroCap.evidence, { call: 1 });
});

Deno.test("tako#v3/search rejects the fields the connector doesn't expose", async () => {
    const unit = await testSealedUnit(ID);
    const bodies: Json[] = [
        { query: "q", variable_cost: false },
        { query: "q", zdr: true },
        { query: "q", sources: { data: { variable_cost: false } } },
        { query: "q", sources: { data: { mode: "inline" } } },
        { query: "q", output_settings: { force_refresh: true } },
    ];
    for (const body of bodies) {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
        );
    }
});

async function sentBody(body: Json): Promise<unknown> {
    let sent: unknown;
    const loaded = await new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_input, init) => {
                sent = JSON.parse(String(init?.body));
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            request_id: "r",
                            usage: { total_cost_usd: 0.007 },
                        }),
                        {
                            status: 200,
                            headers: { "content-type": "application/json" },
                        },
                    ),
                );
            },
        }),
    }).load(await testSealedUnit(ID));
    await loaded.run({ body });
    return sent;
}

Deno.test("tako#v3/search sends the binding defaults to Tako", async () => {
    assertEquals(await sentBody({ query: "stripe.com monthly visits" }), {
        query: "stripe.com monthly visits",
        effort: "fast",
        sources: {
            data: {
                count: 5,
                include_contents: false,
                max_rows: 20,
                max_variable_cost_usd: 0.25,
            },
            web: { highlights: true },
        },
    });
});

Deno.test("tako#v3/search keeps a caller's sources as sent, defaults filled in", async () => {
    assertEquals(
        await sentBody({
            query: "stripe.com monthly visits",
            sources: { data: { include_contents: true } },
        }),
        {
            query: "stripe.com monthly visits",
            effort: "fast",
            sources: {
                data: {
                    count: 5,
                    include_contents: true,
                    max_rows: 20,
                    max_variable_cost_usd: 0.25,
                },
            },
        },
    );
});

Deno.test("tako#v3/search compiled schema carries the binding defaults", async () => {
    const unit = await testSealedUnit(ID);
    const body = unit.doc.input.schema.body as {
        properties: Record<string, Record<string, unknown>>;
    };
    const sources = body.properties.sources as {
        default: unknown;
        description?: string;
        properties: Record<
            string,
            {
                description?: string;
                properties: Record<string, { default?: unknown }>;
            }
        >;
    };

    assertEquals(body.properties.effort.default, "fast");
    assertEquals(sources.default, { data: {}, web: {} });
    assertEquals(sources.description, SOURCES_DESCRIPTION);
    assertEquals(sources.properties.data.description, DATA_SOURCE_DESCRIPTION);
    assertEquals(sources.properties.web.description, WEB_SOURCE_DESCRIPTION);
    assertEquals(sources.properties.data.properties.count.default, 5);
    assertEquals(
        sources.properties.data.properties.max_variable_cost_usd.default,
        0.25,
    );
    assertEquals(sources.properties.data.properties.max_rows.default, 20);
    assertEquals(sources.properties.web.properties.highlights.default, true);
});

Deno.test("tako#v3/search provider error is zero-billed data", async () => {
    const result = await run("synthetic-unauthorized.json", { query: "q" });

    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test({
    name: "tako#v3/search live (gated on TAKO_API_KEY)",
    ignore: liveSkip("tako"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const input = {
            body: {
                query: "US unemployment rate",
                sources: { data: { include_contents: true, max_rows: 5 } },
            },
        };
        const hold = await estimateEndpoint(unit, input);
        const result = await runEndpoint({ unit, input, mode: "live" });

        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const settled = result.usage.credits.default;
        assert(
            typeof settled === "number" && settled <= hold.credits.default,
            `settled ${settled} above the hold ${hold.credits.default}`,
        );
        assert(!("usage" in (result.output as Record<string, unknown>)));
    },
});

Deno.test({
    name:
        "tako#v3/search live card prices fit the rates the hold assumes (gated on TAKO_API_KEY)",
    ignore: liveSkip("tako"),
    fn: async () => {
        const heldRowCpmUsd = 1.6;
        const heldCardBaselineUsd = 0.001;
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: {
                body: {
                    query: "Stripe headcount and website traffic",
                    sources: { data: { count: 20 } },
                },
            },
            mode: "live",
        });

        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const cards = (result.output as { cards?: Json[] }).cards ?? [];
        const prices = cards.flatMap((card) => {
            const pricing = (card as {
                content?: {
                    export_pricing?: {
                        baseline_usd: number;
                        row_cpm_usd: number;
                    };
                };
            }).content?.export_pricing;
            return pricing === undefined ? [] : [pricing];
        });
        assert(prices.length > 0, "no card carried export_pricing");
        for (const price of prices) {
            assert(
                price.row_cpm_usd <= heldRowCpmUsd,
                `row rate ${price.row_cpm_usd} per 1,000 above the held ${heldRowCpmUsd}`,
            );
            assert(
                price.baseline_usd <= heldCardBaselineUsd,
                `card baseline ${price.baseline_usd} above the held ${heldCardBaselineUsd}`,
            );
        }
    },
});
