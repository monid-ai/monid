import { assertEquals, assertRejects } from "@std/assert";
import { loadFixture } from "@shared/testing";
import { runStrictReplay } from "./strict-replay.ts";

async function recording() {
    const fixture = await loadFixture(
        new URL("./fixtures/recorded-2026-10-22-google.json", import.meta.url)
            .pathname,
    );
    fixture.name = "synthetic-strict-replay-guard";
    fixture.description =
        "Offline replay-guard scenarios, not new native calls.";
    return fixture;
}

Deno.test("strict replay: a matching chain retains the native response", async () => {
    const fixture = await recording();
    const result = await runStrictReplay("google/search", fixture);
    assertEquals(result.isProviderError, false);
    assertEquals(result.httpStatus, 200);
    assertEquals(result.output, {
        provider_http_status: 200,
        provider_response: fixture.calls[0].res.body,
    });
});

Deno.test("strict replay: a matching provider failure remains valid test data", async () => {
    const fixture = await recording();
    fixture.calls[0].res = {
        status: 401,
        body: { error: "Synthetic rejection" },
    };
    const result = await runStrictReplay("google/search", fixture);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("strict replay: rejects a mismatched request URL", async () => {
    const fixture = await recording();
    fixture.calls[0].req.url += "?unexpected=true";
    await assertRejects(
        () => runStrictReplay("google/search", fixture),
        Error,
        "Strict replay URL mismatch",
    );
});

for (const status of [200, 401]) {
    Deno.test(`strict replay: body mismatch cannot hide behind HTTP ${status}`, async () => {
        const fixture = await recording();
        const body = structuredClone(fixture.calls[0].req.body) as {
            input: { q: string };
        };
        body.input.q = "Synthetic changed query";
        if (status === 401) {
            fixture.calls[0].res = {
                status,
                body: { error: "Synthetic rejection" },
            };
        }
        await assertRejects(
            () => runStrictReplay("google/search", fixture, body),
            Error,
            "Strict replay body mismatch",
        );
    });
}

Deno.test("strict replay: rejects a mismatched polling method", async () => {
    const fixture = await recording();
    const final = fixture.calls[0].res;
    fixture.calls[0].res = { status: 201, body: { taskId: "GUARD" } };
    fixture.calls.push({
        req: {
            method: "HEAD",
            url: "https://api.scrapeless.com/api/v1/scraper/result/GUARD",
        },
        res: final,
    });
    await assertRejects(
        () => runStrictReplay("google/search", fixture),
        Error,
        "Strict replay method mismatch",
    );
});

Deno.test("strict replay: rejects an unused recorded read", async () => {
    const fixture = await recording();
    fixture.calls.push({
        req: { method: "GET", url: "https://api.scrapeless.com/unused" },
        res: { status: 200, body: {} },
    });
    await assertRejects(
        () => runStrictReplay("google/search", fixture),
        Error,
        "Strict replay call count",
    );
});

Deno.test("strict replay: rejects an unrecorded extra request", async () => {
    const fixture = await recording();
    fixture.calls[0].res = { status: 201, body: { taskId: "GUARD" } };
    await assertRejects(
        () => runStrictReplay("google/search", fixture),
        Error,
        "Strict replay call count",
    );
});

Deno.test("strict replay: rejects a fixture containing two submissions", async () => {
    const fixture = await recording();
    fixture.calls.push(structuredClone(fixture.calls[0]));
    await assertRejects(
        () => runStrictReplay("google/search", fixture),
        Error,
        "Strict replay requires exactly one recorded submission",
    );
});
