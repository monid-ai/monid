import { assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "specstream#v1/web-search";

Deno.test("specstream#v1/web-search: an answered search bills the price on its receipt", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: { q: "In what year was Symfony first released?", num: 2 },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-web-search-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    const data = (result.output as { data: Record<string, unknown> }).data;
    assertEquals(data.kind, "fact");
    const answer = data.answer as { value: string; page: string };
    assertEquals(typeof answer.value, "string");
    assertEquals(answer.page.startsWith("https://"), true);
    assertEquals(result.usage, {
        credits: { default: 0.005 },
        evidence: { CREDIT: 50 },
    });
    assertEquals(result.usage.mismatch, undefined);
});

Deno.test("specstream#v1/web-search: a fast search returns results alone at the fast price", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: {
            body: { q: "deno runtime release notes", speed: "fast", num: 2 },
        },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-web-search-fast.json`),
    });
    assertEquals(result.httpStatus, 200);
    const data = (result.output as { data: Record<string, unknown> }).data;
    assertEquals(data.answer, null);
    assertEquals((data.sources as unknown[]).length, 2);
    assertEquals(result.usage, {
        credits: { default: 0.001 },
        evidence: { CREDIT: 10 },
    });
});

Deno.test("specstream#v1/web-search: a refused request is zero-billed error data", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { q: "   " } },
        mode: "replay",
        fixture: await loadFixture(
            `${chains}synthetic-web-search-rejected.json`,
        ),
    });
    assertEquals(result.httpStatus, 422);
    assertEquals(result.isProviderError, true);
    assertEquals(
        (result.output as { code?: string }).code,
        "unquoted_plan",
    );
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("specstream#v1/web-search: the gate needs q and bounds every field", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-web-search-ok.json`);
    const required = unit.doc.input.schema.body?.required as string[];
    assertEquals(required, ["q"]);
    const rejected = (body: Json) =>
        assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    await rejected({});
    await rejected({ q: "" });
    await rejected({ q: "x".repeat(2001) });
    await rejected({ q: "news", num: 0 });
    await rejected({ q: "news", num: 101 });
    await rejected({ q: "news", page: 11 });
    await rejected({ q: "news", speed: "slow" });
    await rejected({ q: "news", country: "DEU" });
    await assertInputAccepted({
        unit,
        mode: "replay",
        fixture,
        input: {
            body: {
                q: "x".repeat(2000),
                speed: "fast",
                num: 100,
                page: 10,
                news: true,
                language: "de",
                country: "DE",
                safe: "strict",
            },
        },
    });
});
