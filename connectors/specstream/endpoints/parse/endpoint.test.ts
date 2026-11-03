import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json } from "@shared/core";
import {
    assertInputAccepted,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "specstream#v1/parse";
const BODY = { q: "dental clinics in Lyon, with name, website and email" };

Deno.test("specstream#v1/parse: a runnable reading hands back the ast_hash and bills nothing", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: BODY },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-parse-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    const data = (result.output as { data: Record<string, unknown> }).data;
    assertEquals(data.status, "runnable");
    assertEquals(typeof data.ast_hash, "string");
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("specstream#v1/parse: an ambiguous request comes back needs_edit with no hash to price", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { q: "dental clinics in Springfield" } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-parse-needs-edit.json`),
    });
    assertEquals(result.httpStatus, 200);
    const data = (result.output as { data: Record<string, unknown> }).data;
    assertEquals(data.status, "needs_edit");
    assertEquals(data.ast_hash, null);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("specstream#v1/parse: the gate needs q, and bounds it and the locale", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-parse-ok.json`);
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
    await rejected({ q: "x".repeat(16_001) });
    await rejected({ q: "clinics", locale: "en_US" });
    await rejected({ q: "clinics", locale: "english" });
    await assertInputAccepted({
        unit,
        input: { body: { q: "x".repeat(16_000), locale: "fr-FR" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "specstream#v1/parse live (gated on SPECSTREAM_API_KEY)",
    ignore: liveSkip("specstream"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: BODY },
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assert(result.usage.credits.default === undefined);
    },
});
