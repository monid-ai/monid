import { assert, assertEquals, assertRejects } from "@std/assert";
import { directTransport, Engine } from "@monid/connector-engine";
import { estimateEndpoint, loadFixture, testSealedUnit } from "@shared/testing";
import type { Json } from "@shared/core";
import { reviewCases } from "./review-cases.ts";
import { runStrictReplay as strictRun } from "./strict-replay.ts";

async function recording(name: string) {
    return await loadFixture(
        new URL(`./fixtures/${name}.json`, import.meta.url).pathname,
    );
}
for (const [id, name, price] of reviewCases) {
    Deno.test(`review ${id}: exact native wire, complete recorded result and one declared charge`, async () => {
        const fixture = await recording(name);
        const result = await strictRun(id, fixture);
        assertEquals(result.isProviderError, false);
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage.credits, { default: price });
        assertEquals(
            (result.output as Record<string, Json>).provider_response,
            fixture.calls.at(-1)!.res.body,
        );
        const unit = await testSealedUnit("scrapeless#" + id);
        assertEquals(unit.doc.id, "scrapeless#" + id);
        assertEquals(
            new URL(unit.doc.request.url).origin,
            "https://api.scrapeless.com",
        );
        assert(unit.doc.meta.description && unit.doc.meta.docsUrl);
        assertEquals(unit.doc.usage.consolidate, undefined);
    });
    Deno.test(`review ${id}: synthetic auth failure stays an error, not supplier-free billing`, async () => {
        const original = await recording(name);
        const result = await strictRun(id, {
            name: "synthetic-review-auth",
            description:
                "Offline authentication branch, not live supplier evidence.",
            calls: [{
                req: original.calls[0].req,
                res: { status: 401, body: { error: "Invalid API key" } },
            }],
        });
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
    Deno.test(`review ${id}: required business inputs enforced before network`, async () => {
        const unit = await testSealedUnit("scrapeless#" + id);
        await assertRejects(() =>
            estimateEndpoint(unit, { body: { input: {} } })
        );
    });
}

const commerce = reviewCases.filter(([id]) =>
    id.startsWith("amazon/") || id.startsWith("tiktok/")
);
for (const [id, name] of commerce) {
    Deno.test(`review ${id}: ambiguous POST returns uncertainty without resubmitting`, async () => {
        const fixture = await recording(name);
        let calls = 0;
        const loaded = await new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "SYNTHETIC_KEY" }),
                fetch: () => {
                    calls++;
                    return Promise.reject(
                        new Error("Synthetic connection loss after send"),
                    );
                },
            }),
        }).load(await testSealedUnit("scrapeless#" + id));
        const result = await loaded.run({ body: fixture.calls[0].req.body! });
        assertEquals(calls, 1);
        assertEquals(result.isProviderError, true);
        assertEquals(
            (result.output as Record<string, Json>).submission_uncertain,
            true,
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
    Deno.test(`review ${id}: response cannot replace the original task ID`, async () => {
        const fixture = await recording(name);
        const result = await strictRun(id, {
            name: "synthetic-review-task-mismatch",
            description: "Offline foreign task identifier branch.",
            calls: [
                {
                    req: fixture.calls[0].req,
                    res: { status: 201, body: { taskId: "ORIGINAL" } },
                },
                {
                    req: {
                        method: "GET",
                        url: "https://api.scrapeless.com/api/v1/scraper/result/ORIGINAL",
                    },
                    res: {
                        status: 202,
                        body: { status: "running", taskId: "FOREIGN" },
                    },
                },
            ],
        });
        assertEquals(result.isProviderError, true);
        assertEquals(
            (result.output as Record<string, Json>).task_id,
            "ORIGINAL",
        );
        assertEquals(result.usage, { credits: {}, evidence: {} });
    });
}
for (const [errors, succeeds] of [[3, true], [4, false]] as const) {
    Deno.test(`review commerce: ${errors} transient reads, bounded recovery=${succeeds}`, async () => {
        const real = await recording("recorded-closure-amazon-product");
        const req = {
            method: "GET",
            url: "https://api.scrapeless.com/api/v1/scraper/result/ORIGINAL",
        };
        const result = await strictRun("amazon/product", {
            name: "synthetic-review-transient",
            description: "Offline bounded polling, not a live rate-limit test.",
            calls: [
                {
                    req: real.calls[0].req,
                    res: { status: 201, body: { taskId: "ORIGINAL" } },
                },
                ...Array.from(
                    { length: errors },
                    () => ({
                        req,
                        res: {
                            status: 429,
                            headers: { "retry-after": "120" },
                            body: { error: "Synthetic limit" },
                        },
                    }),
                ),
                ...(succeeds ? [{ req, res: real.calls.at(-1)!.res }] : []),
            ],
        });
        assertEquals(result.isProviderError, !succeeds);
        assertEquals(result.usage.credits, succeeds ? { default: 0.003 } : {});
    });
}
Deno.test("review commerce: expired original task is not recreated", async () => {
    const real = await recording("recorded-closure-amazon-product");
    const result = await strictRun("amazon/product", {
        name: "synthetic-review-expired",
        description: "Offline HTTP 410 handling.",
        calls: [
            {
                req: real.calls[0].req,
                res: { status: 201, body: { taskId: "ORIGINAL" } },
            },
            {
                req: {
                    method: "GET",
                    url: "https://api.scrapeless.com/api/v1/scraper/result/ORIGINAL",
                },
                res: { status: 410, body: { error: "Task expired" } },
            },
        ],
    });
    assertEquals(result.httpStatus, 410);
    assertEquals((result.output as Record<string, Json>).task_id, "ORIGINAL");
});
Deno.test("review commerce: null product markers cannot turn HTTP 200 into business success", async () => {
    const real = await recording("recorded-closure-amazon-product");
    const result = await strictRun("amazon/product", {
        name: "synthetic-review-null-result",
        description: "Offline malformed result.",
        calls: [{
            req: real.calls[0].req,
            res: { status: 200, body: { asin: null, title: null } },
        }],
    });
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage.credits, {});
});
