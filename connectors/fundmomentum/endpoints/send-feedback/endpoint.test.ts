import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { fromFileUrl } from "@std/path";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

const fixturesDir = fromFileUrl(new URL("fixtures/", import.meta.url));

Deno.test("fundmomentum#mcp/send_feedback happy (real recording): one-way, always free", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/send_feedback");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const result = await runEndpoint({
        unit,
        input: {
            body: {
                message: "Test call while updating the Monid connector " +
                    "fixtures for get_usage/send_feedback — please " +
                    "disregard.",
                category: "other",
            },
        },
        mode: "replay",
        fixture,
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, { credits: {}, evidence: {} });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.status, "received");
    assertEquals(output.remaining_today, 4);
    // the MCP envelope and its billing bookkeeping never reach the caller
    assertEquals("content" in output, false);
    assertEquals("_meta" in output, false);
});

Deno.test("fundmomentum#mcp/send_feedback: message required (1–1000 chars); category/tool_name are closed enums", async () => {
    const unit = await testSealedUnit("fundmomentum#mcp/send_feedback");
    const fixture = await loadFixture(`${fixturesDir}happy.json`);
    const rejected: Json[] = [
        {},
        { message: "" },
        { message: "x".repeat(1001) },
        { message: "ok", category: "feature_request" },
        { message: "ok", tool_name: "search_lp" },
    ];
    for (const body of rejected) {
        await assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
            JSON.stringify(body),
        );
    }
    const passing: Json[] = [
        { message: "ok" },
        { message: "ok", category: "missing_feature" },
        { message: "ok", tool_name: "search_funds" },
    ];
    for (const body of passing) {
        const ok = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(ok.isProviderError, false, JSON.stringify(body));
    }
});
