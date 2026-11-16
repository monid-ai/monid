import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "specstream#v1/extract";

Deno.test("specstream#v1/extract: only the page that gave text is billed", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { urls: ["https://example.com/", "notaurl"] } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-extract-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    const results = (result.output as {
        data: { results: { status: string; text: string }[] };
    }).data.results;
    assertEquals(results.map((r) => r.status), ["ok", "invalid_url"]);
    assertEquals(results[0].text.length > 0, true);
    // two pages were asked for and estimated; one was read and charged
    assertEquals(result.usage.credits, { default: 0.0008 });
    assertEquals(result.usage.evidence, { CREDIT: 8 });
});

Deno.test("specstream#v1/extract: estimate bills every requested page", async () => {
    const unit = await testSealedUnit(ID);
    assertEquals(
        await estimateEndpoint(unit, {
            body: { urls: ["https://example.com/", "https://example.org/"] },
        }),
        {
            credits: { default: 0.0016 },
            evidence: { CREDIT: 16 },
        },
    );
});

Deno.test("specstream#v1/extract: a refused key is zero-billed error data", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { urls: ["https://example.com/"] } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-unauthorized.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(
        (result.output as { code?: string }).code,
        "invalid_token",
    );
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("specstream#v1/extract: the gate needs 1 to 20 urls", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-extract-ok.json`);
    const required = unit.doc.input.schema.body?.required as string[];
    assertEquals(required, ["urls"]);
    const rejected = (body: Json) =>
        assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    await rejected({});
    await rejected({ urls: [] });
    await rejected({ urls: Array(21).fill("https://example.com/") });
    await rejected({ urls: ["https://example.com/"], format: "pdf" });
    await assertInputAccepted({
        unit,
        mode: "replay",
        fixture,
        input: {
            body: {
                urls: Array(20).fill("https://example.com/"),
                format: "text",
                include: ["links", "full_text"],
            },
        },
    });
});

Deno.test({
    name: "specstream#v1/extract live (gated on SPECSTREAM_API_KEY)",
    ignore: liveSkip("specstream"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { urls: ["https://example.com/"] } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        assertEquals(Object.keys(result.usage.evidence).sort(), ["CREDIT"]);
        assertEquals(typeof result.usage.credits.default, "number");
        const results = (result.output as {
            data: { results: unknown[] };
        }).data.results;
        assert(Array.isArray(results) && results.length === 1);
    },
});
