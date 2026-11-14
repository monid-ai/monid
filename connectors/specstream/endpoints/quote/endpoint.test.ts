import { assertEquals, assertRejects } from "@std/assert";
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
const ID = "specstream#v1/capacity/quotes";
const AST_HASH =
    "0c85f280cf7589092edc7487029bb4ddf97e5b69cdaf84090d350f6b4693a734";

Deno.test("specstream#v1/capacity/quotes: a quote carries the maximum and the ids to approve, and bills nothing", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { ast_hash: AST_HASH, requested_units: 3 } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-quote-ok.json`),
    });
    assertEquals(result.httpStatus, 200);
    const data = (result.output as { data: Record<string, unknown> }).data;
    assertEquals(data.maximum_cents, 60);
    assertEquals(typeof data.quote_id, "string");
    assertEquals(typeof data.quote_hash, "string");
    assertEquals(data.can_authorize, true);
    // a quote is a price, never a charge
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("specstream#v1/capacity/quotes: a refused key is zero-billed error data", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(ID),
        input: { body: { ast_hash: AST_HASH } },
        mode: "replay",
        fixture: await loadFixture(`${chains}synthetic-quote-refused.json`),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(
        (result.output as { message: string; code?: string }).code,
        "invalid_token",
    );
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("specstream#v1/capacity/quotes: ast_hash is required and requested_units defaults to 25", async () => {
    const unit = await testSealedUnit(ID);
    const body = unit.doc.input.schema.body;
    assertEquals(body?.required, ["ast_hash"]);
    const properties = body?.properties as Record<string, { default?: number }>;
    assertEquals(properties.requested_units.default, 25);
});

Deno.test("specstream#v1/capacity/quotes: the gate bounds the hash and the unit count", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-quote-ok.json`);
    const rejected = (body: Json) =>
        assertRejects(
            () =>
                runEndpoint({ unit, input: { body }, mode: "replay", fixture }),
            Error,
            "INVALID_INPUT",
        );
    await rejected({});
    await rejected({ ast_hash: AST_HASH.slice(1) });
    await rejected({ ast_hash: AST_HASH.replace("a", "g") });
    await rejected({ ast_hash: AST_HASH, requested_units: 0 });
    await rejected({ ast_hash: AST_HASH, requested_units: 10_001 });
    await assertInputAccepted({
        unit,
        input: { body: { ast_hash: AST_HASH, requested_units: 10_000 } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "specstream#v1/capacity/quotes live (gated on SPECSTREAM_API_KEY)",
    ignore: liveSkip("specstream"),
    fn: async () => {
        // reading and pricing a request are both free: parse it, then quote
        // the hash it hands back. Nothing here reserves or spends.
        const parsed = await runEndpoint({
            unit: await testSealedUnit("specstream#v1/parse"),
            input: { body: { q: "dental clinics in Lyon, with their email" } },
            mode: "live",
        });
        const hash = (parsed.output as { data?: { ast_hash?: string } }).data
            ?.ast_hash;
        if (typeof hash !== "string") return;
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: { body: { ast_hash: hash, requested_units: 3 } },
            mode: "live",
        });
        assertEquals(result.isProviderError, false);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    },
});
